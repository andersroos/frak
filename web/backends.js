import {
    BACKEND_KEY,
    STATE_CALCULATING,
    STATE_ABORTING,
    STATE_WAITING,
    STATE_WAITING_ABORTED,
    STATE_WAITING_OFFLINE,
    STATE_WAITING_STARTUP,
    STATE_WAITING_COMPLETED
} from "./store";
import {guessBrowser, guessHardwareConcurrency} from "./util";
import {ABORTED, BLOCK_COMPLETED, BLOCK_STARTED, COMPLETED, START, ABORT} from "./op";
import {X_SIZE, Y_SIZE} from "./dimensions";


class LocalBackend {

    constructor(store, backends, key) {
        this.store = store;
        this.key = key;
        this.backends = backends;
        this.store.putBackendAlive(this.key, true);
        this.max_workers = guessHardwareConcurrency();
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onMessage(e);
    }

    reconnect() {
        this.abort({id: 0});
    }

    start({id, x_size, y_size, max_n, x0_start_index, x0_delta, y0_start_index, y0_delta, workers}) {
        this.dispatcher.postMessage({op: START, id, x_size, y_size, max_n, x0_start_index, x0_delta, y0_start_index, y0_delta, workers});
    }

    abort() {
        this.dispatcher.postMessage({op: ABORT});
    }

    alive() {
        return true;
    }

    onMessage(event) {
        const params = event.data;
        // TODO console.info("got op", params);
        switch (params.op) {
            case BLOCK_COMPLETED: this.backends.onBlockCompleted(params); break;
            case BLOCK_STARTED: this.backends.onBlockStarted(params); break;
            case COMPLETED: this.backends.onCompleted(params); break;
            case ABORTED: this.backends.onAborted(params); break;
            default: throw new Error(`unkwnon op ${params.op}`);
        }
    }
}


class RemoteBackend {

    constructor(store, backends, key, url) {
        this.store = store;
        this.key = key;
        this.url = url;
        this.backends = backends;
        this.connect();
        this.max_workers = 1;
    }

    connect() {
        if (this.connection) {
            this.connection.close();
        }
        this.connection = new WebSocket(this.url);
        this.connection.binaryType = "arraybuffer";
        this.connection.onmessage = this.onMessage.bind(this);
        this.connection.onclose = this.onClose.bind(this);
        this.connection.onopen = this.onOpen.bind(this);
    }

    alive() {
        return this.store.getBackendAlive(this.key);
    }

    reconnect() {
        // TODO
    }

    onOpen(e) {
        console.info(this.key, "open", e);
        this.store.putBackendAlive(this.key, true);
    }

    onMessage(e) {
        console.info(this.key, "message", e);
        if (e.data instanceof String) {
            const data = JSON.parse(e.data);
            switch (data.op) {
                case CONFIG: this.max_workers = data.max_workers; break;
                default: throw new Error($`unknown op ${data.op} from ${this.key}`);
            }
        }
        else {
        }
    }

    onClose(e) {
        this.store.putBackendAlive(this.key, false);
        console.info(this.key, "close", e);
    }
}

const ABORT_TIMEOUT = 5000;


export class Backends {

    constructor(store) {
        this.store = store;
        this.store.subscribe(this.onChange.bind(this))

        const browser = guessBrowser();
        this.backends = Object.fromEntries([
            new RemoteBackend(store, this, "java", "ws://frak.ygram.se:44001/"),
            new LocalBackend(store, this, browser + "*js"),
        ].map(backend => [backend.key, backend]));

        console.info(STATE_WAITING_STARTUP);
        this.store.state = STATE_WAITING_STARTUP;
        this.selectedBackend = this.backends[this.store.backend];
        this.requestedCalculation = null;
        this.currenctCalculation = null;

        setInterval(() => this.reviveBackend(), 1000);
        setInterval(() => this.handleCalculationState(), 200);
    }

    // Request a start using the parameters. Callbacks are not called if this configuration is overwritten before it starts.
    requestCalculation(params) {
        this.requestedCalculation = params;
        this.handleCalculationState();
    }

    handleCalculationState() {
        if (this.store.state.startsWith(STATE_WAITING)) {
            if (this.requestedCalculation) {
                if (this.selectedBackend.alive()) {
                    this.store.state = STATE_CALCULATING;
                    this.start();
                }
                else {
                    this.state = STATE_WAITING_OFFLINE;
                }
            }
        }
        else if (this.store.state.startsWith(STATE_ABORTING)) {
            if (performance.now() - this.currenctCalculation.abortTime > ABORT_TIMEOUT) {
                this.store.state = STATE_WAITING_ABORTED;
                this.currenctCalculation.onAborted(this.currenctCalculation);
                this.currenctCalculation.backend.reconnect();
            }
        }
        else if (this.store.state.startsWith(STATE_CALCULATING)) {
            if (this.requestedCalculation) {
                this.store.state = STATE_ABORTING;
                this.currenctCalculation.backend.abort(this.currenctCalculation);
            }
        }
    }

    start() {
        this.currenctCalculation = this.requestedCalculation;
        this.requestedCalculation = null;

        this.currenctCalculation.id = Date.now();
        this.currenctCalculation.backend = this.selectedBackend;
        this.currenctCalculation.workers = Math.min(this.selectedBackend.max_workers, this.store.workers);
        this.currenctCalculation.x_size = X_SIZE;
        this.currenctCalculation.y_size = Y_SIZE;

        this.currenctCalculation.onBeforeStart();

        this.currenctCalculation.startTime = performance.now();

        this.currenctCalculation.backend.start(this.currenctCalculation);
    }

    listBackends() {
        return Object.keys(this.backends).sort();
    }

    getElapsedTime() {
        const curr = this.currenctCalculation;
        if (!curr) return null;
        if (!curr.startTime) return null;
        if (curr.completeTime) return curr.completeTime - curr.startTime;
        if (curr.abortTime) return curr.abortTime - curr.startTime;
        return performance.now() - curr.startTime;
    }



    reviveBackend() {
        if (this.selectedBackend && !this.selectedBackend.alive()) {
            this.selectedBackend.connect();
        }
    }

    onBlockCompleted({id, x_start, y_start, x_size, y_size, bytes}) {
        // TODO console.info("block completed", id);
        if (!this.currenctCalculation || this.currenctCalculation.id !== id) return;
        this.currenctCalculation.onBlockCompleted({id, x_start, y_start, x_size, y_size, bytes});

    }

    onBlockStarted({id, x_start, y_start, x_size, y_size}) {
        if (!this.currenctCalculation || this.currenctCalculation.id !== id) return;
        this.currenctCalculation.onBlockStarted({id, x_start, y_start, x_size, y_size});

    }

    onCompleted({id}) {
        console.info("completed", id);
        if (!this.currenctCalculation || this.currenctCalculation.id !== id) return;
        this.currenctCalculation.completeTime = performance.now();
        this.currenctCalculation.onCompleted(this.currenctCalculation);
        this.store.state = STATE_WAITING_COMPLETED;
        this.handleCalculationState();
    }

    onAborted({id}) {
        console.info("abort", id);
        if (!this.currenctCalculation || this.currenctCalculation.id !== id) return;
        this.currenctCalculation.abortTime = performance.now();
        this.currenctCalculation.onAborted(this.currenctCalculation);
        this.store.state = STATE_WAITING_ABORTED;
        this.handleCalculationState();
    }

    onChange(key, before, after) {
        if (key === BACKEND_KEY && before !== after) {
            this.selectedBackend = this.backends[after];
        }
    }

}