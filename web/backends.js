import {BACKEND_KEY} from "./store";


class LocalBackend {
    constructor(store, key) {
        this.store = store;
        this.key = key;
        this.store.putBackendAlive(this.key, true);
    }

    reconnect() {
        // TODO, restart dispatcher?
    }

    alive() {
        return true;
    }
}


class RemoteBackend {

    constructor(store, key, url) {
        this.store = store;
        this.key = key;
        this.url = url;
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
                case "config": this.max_workers = data.max_workers; break;
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

export const STATE_WAITING = "waiting";
export const STATE_WAITING_STARTUP = "waiting-startup";
export const STATE_WAITING_OFFLINE = "waiting-offline";
export const STATE_WAITING_COMPLETED = "waiting-completed";
export const STATE_WAITING_ABORTED = "waiting-aborted";
export const STATE_INTERRUPTING = "interrupting";
export const STATE_CALCULATING = "calculating";

const INTERRUPT_TIMEOUT = 5000;

export class Backends {

    constructor(store) {
        this.store = store;
        this.store.subscribe(this.onChange.bind(this))
        this.state = STATE_WAITING_STARTUP;

        let browser = "browser";
        if (navigator.userAgent.match(/Chrome\//)) browser = "chrome";
        else if (navigator.userAgent.match(/Firefox\//)) browser = "firefox";

        this.backends = Object.fromEntries([
            new RemoteBackend(store, "java", "ws://frak.ygram.se:44001/"),
            new LocalBackend(store, browser + "*js"),
        ].map(backend => [backend.key, backend]));

        this.selectedBackend = this.backends[this.store.backend];
        this.requestedCalculation = null;
        this.currenctCalculation = null;

        setInterval(() => this.reviveBackend(), 1000);
        setInterval(() => this.handleCalculationState(), 200);
    }

    // Request a start using the parameters. Callbacks onBeforeStart, onCompleted, onAborted will be called, but may
    // never be called if this configuration does not start
    requestCalculation({onBeforeStart, onCompleted, onAborted, x0_start_index, x0_delta, y0_start_index, y0_delta, max_n}) {
        this.requestedCalculation = {
            onBeforeStart,
            onCompleted,
            onAborted,
            x0_start_index,
            x0_delta,
            y0_start_index,
            y0_delta,
            max_n
        };
        this.handleCalculationState();
    }

    handleCalculationState() {
        if (this.state.startsWith(STATE_WAITING)) {
            if (this.requestedCalculation) {
                if (this.selectedBackend.alive()) {
                    this.state = STATE_CALCULATING;
                    this.start();
                }
                else {
                    this.state = STATE_WAITING_OFFLINE;
                }
            }
        }
        else if (this.state.startsWith(STATE_INTERRUPTING)) {
            if (performance.now() - this.currenctCalculation.interruptTime > INTERRUPT_TIMEOUT) {
                this.state = STATE_WAITING_ABORTED;
                this.currenctCalculation.onAborted();
                this.currenctCalculation.backend.reconnect();
            }
        }
        else if (this.state.startsWith(STATE_CALCULATING)) {
            if (this.requestedCalculation) {
                this.state = STATE_INTERRUPTING;
                this.currenctCalculation.backend.interrupt();
            }
        }
    }

    start() {
        this.currenctCalculation = this.requestedCalculation;
        this.currenctCalculation.id = Date.now();
        this.currenctCalculation.backend = this.selectedBackend;
        this.currenctCalculation.workers =  24; // TODO
        this.currenctCalculation.startTime = performance.now();

        if (this.currenctCalculation.onBeforeStart) this.currenctCalculation.onBeforeStart();

        backend.start(this.currenctCalculation);
    }

    //     if (this.state === STATE_WAITING) {
    //         if (!this.selectedBackend.alive()) {
    //
    //         }
    //     }
    //
    //     if (Boolean(this.startTime) !== Boolean(this.endTime)) {
    //         return;
    //     }
    //
    //     this.screen.clearInProgress();
    //
    //     this.startTime = performance.now();
    //     this.endTime = null;
    //     this.workersAtStart = this.gui.workerCountInput.getValue();
    //     this.backendAtStart = 'chrome*js';
    //
    //     this.dispatcher.postMessage({op: CONFIGURE, worker_count: this.workersAtStart});
    //
    //     console.info("starting", this.id, this.x0_start_index, this.x0_delta, this.y0_start_index, this.y0_delta, this.max_n, this.workersAtStart, this.backendAtStart);
    //
    //     this.dispatcher.postMessage({
    //         id: this.id,
    //         x_size: X_SIZE,
    //         y_size: Y_SIZE,
    //         x0_start_index: this.x0_start_index,
    //         x0_delta: this.x0_delta,
    //         y0_start_index: this.y0_start_index,
    //         y0_delta: this.y0_delta,
    //         max_n: this.max_n,
    //         op: START,
    //     });
    //
    //     this.gui.onEvent();
    //     if (!this.selectedBackend.alive()) {
    //         console.warning("start: backend", this.selectedBackend.key, "not alive, aborting");
    //         return;
    //     }
    // }

    listBackends() {
        return Object.keys(this.backends).sort();
    }

    reviveBackend() {
        if (this.selectedBackend && !this.selectedBackend.alive()) {
            this.selectedBackend.connect();
        }
    }

    onChange(key, before, after) {
        if (key === BACKEND_KEY && before !== after) {
            this.selectedBackend = this.backends[after];
        }
    }
}