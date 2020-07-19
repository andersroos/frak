import {
    CALCULATION_CALCULATING,
    CALCULATION_ABORTING,
    CALCULATION_WAITING,
    CALCULATION_WAITING_ABORTED,
    CALCULATION_WAITING_OFFLINE,
    CALCULATION_WAITING_STARTUP,
    CALCULATION_WAITING_COMPLETED,
    BACKEND_ONLINE,
    BACKEND_CONNECTING,
    BACKEND_OFFLINE
} from "./store";
import {guessBrowser, guessHardwareConcurrency} from "./util";
import {ABORTED, BLOCK_COMPLETED, BLOCK_STARTED, COMPLETED, START, ABORT, CONFIG} from "./op";
import {X_SIZE, Y_SIZE} from "./dimensions";


// Create a calculation id, should be a string of length 16.
const createId = () => String(Date.now()).padStart(16, '0');


class LocalBackend {

    constructor(store, backends, key) {
        this.key = key;
        this.backends = backends;
        this.max_workers = guessHardwareConcurrency();
        this.state = BACKEND_ONLINE;
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onMessage(e);
        this.backends.onBackendStateChange(this.key);
    }

    reconnect() {
        this.abort({id: 0});
    }

    start({id, x_size, y_size, block_x_size, block_y_size, max_n, x0_start_index, x0_delta, y0_start_index, y0_delta, workers}) {
        this.dispatcher.postMessage({op: START, id, x_size, y_size, block_x_size, block_y_size, max_n, x0_start_index, x0_delta, y0_start_index, y0_delta, workers});
    }

    abort({id}) {
        this.dispatcher.postMessage({op: ABORT, id});
    }

    onMessage(event) {
        const params = event.data;
        switch (params.op) {
            case BLOCK_COMPLETED: this.backends.onBlockCompleted(params); break;
            case BLOCK_STARTED: this.backends.onBlockStarted(params); break;
            case COMPLETED: this.backends.onCompleted(params); break;
            case ABORTED: this.backends.onAborted(params); break;
            default: throw new Error(`unkwnon op ${params.op}`);
        }
    }

    guessHardware() {
        const concurrency = guessHardwareConcurrency();
        if (concurrency === 24) return "ni";
        if (navigator.userAgent.match(/Android 7/)) return "sg";
        if (navigator.userAgent.match(/Android 1\d/)) return "px";
        if (concurrency === 4) return "lo";
    }
}


class RemoteBackend {

    constructor(store, backends, key, url) {
        this.key = key;
        this.url = url;
        this.backends = backends;
        this.state = BACKEND_OFFLINE;
        this.connect();
        this.max_workers = 1;
        this.decoder = new TextDecoder();
    }

    connect() {
        if (this.state !== BACKEND_OFFLINE) {
            return;
        }
        console.info("connecting to", this.url);
        this.state = BACKEND_CONNECTING;

        // onclose will be sent after connection errors, so we ignore onerror.
        this.connection = new WebSocket(this.url);
        this.connection.binaryType = "arraybuffer";
        this.connection.onmessage = this.onMessage.bind(this);
        this.connection.onclose = this.onClose.bind(this);
        this.connection.onopen = this.onOpen.bind(this);
        this.backends.onBackendStateChange(this.key);
    }

    reconnect() {
        if (this.connection) {
            // Make sure we do not get any close events since we will create a new connection, then close.
            this.connection.onclose = null;
            this.connection.close();
        }
        this.state = BACKEND_OFFLINE;
        this.connect();
    }

    start({id, x_size, y_size, block_x_size, block_y_size, max_n, x0_start_index, x0_delta, y0_start_index, y0_delta, workers}) {
        this.connection.send(JSON.stringify({op: START, id, x_size, y_size, block_y_size, block_x_size, max_n, x0_start_index, x0_delta, y0_start_index, y0_delta, workers}));
    }

    abort({id}) {
        this.connection.send(JSON.stringify({op: ABORT, id}));
    }

    onOpen(e) {
        console.info(this.key, "open", e);
    }

    onMessage(e) {
        if (typeof e.data === "string") {
            console.info(e.data);
            const data = JSON.parse(e.data);
            // console.info(this.key, "message", data.op, data);
            switch (data.op) {
                case CONFIG: this.onConfig(data); break;
                case ABORTED: this.backends.onAborted(data); break;
                case BLOCK_STARTED: this.backends.onBlockStarted(data); break;
                case COMPLETED: this.backends.onCompleted(data); break;
                default: throw new Error(`unknown op ${data.op} from ${this.key}`);
            }
        }
        else {
            // console.info(this.key, "message", BLOCK_COMPLETED, e);
            this.onBlockCompleted(e.data);
        }
    }

    onClose(e) {
        console.info(this.key, "close");
        this.state = BACKEND_OFFLINE;
        this.backends.onBackendStateChange(this.key);
    }

    onConfig(data) {
        if (this.state !== BACKEND_CONNECTING) {
            logger.warning(this.key, "got onConfig when connection state was", this.state, "expected", BACKEND_CONNECTING);
        }
        this.state = BACKEND_ONLINE;
        this.max_workers = data.max_workers;
        assert(data.endian === "little", "only little endian backends are supported (rip network byte order)");
        this.backends.onBackendStateChange(this.key);
    }

    onBlockCompleted(buffer) {
        const data = new DataView(buffer);
        const id = this.decoder.decode(buffer.slice(0, 16));
        const x_start = data.getUint32(16, true);
        const y_start = data.getUint32(20, true);
        const x_size = data.getUint32(24, true);
        const y_size = data.getUint32(28, true);
        this.backends.onBlockCompleted({id, x_start, y_start, x_size, y_size, bytes: buffer.slice(32, buffer.length)});
    }

    guessHardware() {
        if (this.max_workers === 24) return "ni";
        return "lo";
    }
}

const ABORT_TIMEOUT = 5000;


export class Backends {

    constructor(store, core) {
        this.store = store;
        this.store.subscribe("backend", this.onBackendChange.bind(this))

        this.core = core;

        const browser = guessBrowser();
        this.backends = Object.fromEntries([
            new LocalBackend(store, this, browser + "*js"),
            new RemoteBackend(store, this, "java", "ws://frak.ygram.se:44001/"),
            new RemoteBackend(store, this, "cpp", "ws://frak.ygram.se:44002/"),
        ].map(backend => [backend.key, backend]));

        this.store.state = CALCULATION_WAITING_STARTUP;
        this.selectedBackend = this.backends[this.store.backend];
        this.requestedCalculation = null;
        this.currenctCalculation = null;

        this.onBackendStateChange(this.store.backend);

        setInterval(() => this.reviveBackend(), 1000);
        setInterval(() => this.handleCalculationState(), 200);
    }

    // Request a start using the parameters. Callbacks are not called if this configuration is overwritten before it starts.
    requestCalculation(params) {
        this.requestedCalculation = Object.assign(
            {
                onBeforeStart: () => {},
                onAborted: this.core.onAborted.bind(this.core),
                onCompleted: this.core.onCompleted.bind(this.core),
                onBlockStarted: this.core.onBlockStarted.bind(this.core),
                onBlockCompleted: this.core.onBlockCompleted.bind(this.core),
            },
            params
        );
        this.handleCalculationState();
    }

    handleCalculationState() {
        if (this.store.state.startsWith(CALCULATION_WAITING)) {
            if (this.requestedCalculation) {
                if (this.selectedBackend.state === BACKEND_ONLINE) {
                    this.store.state = CALCULATION_CALCULATING;
                    this.start();
                }
                else {
                    this.store.state = CALCULATION_WAITING_OFFLINE;
                    this.requestedCalculation = null;
                }
            }
        }
        else if (this.store.state.startsWith(CALCULATION_ABORTING)) {
            if (performance.now() - this.currenctCalculation.abortTime > ABORT_TIMEOUT) {
                this.store.state = CALCULATION_WAITING_ABORTED;
                this.currenctCalculation.onAborted(this.currenctCalculation);
                this.currenctCalculation.backend.reconnect();
            }
        }
        else if (this.store.state.startsWith(CALCULATION_CALCULATING)) {
            if (this.requestedCalculation) {
                this.store.state = CALCULATION_ABORTING;
                this.currenctCalculation.backend.abort(this.currenctCalculation);
            }
        }
    }

    start() {
        this.currenctCalculation = this.requestedCalculation;
        this.requestedCalculation = null;

        this.currenctCalculation.id = createId();
        this.currenctCalculation.backend = this.selectedBackend;
        this.currenctCalculation.workers = this.store.getWorkerCount();
        this.currenctCalculation.hardware = this.selectedBackend.guessHardware();
        this.currenctCalculation.x_size = X_SIZE;
        this.currenctCalculation.y_size = Y_SIZE;
        this.currenctCalculation.block_x_size = X_SIZE;
        this.currenctCalculation.block_y_size = 1;
        // this.currenctCalculation.block_y_size = Y_SIZE / 8;
        const {x0_delta, y0_delta, x0_start_index, y0_start_index} = this.currenctCalculation;
        this.store.coordinates = {x0_delta, y0_delta, x0_start_index, y0_start_index};

        this.currenctCalculation.onBeforeStart();

        this.currenctCalculation.startTime = performance.now();

        if (this.currenctCalculation.y_size % this.currenctCalculation.block_y_size !== 0
            || this.currenctCalculation.x_size % this.currenctCalculation.block_x_size !== 0) {
            throw new Error("y_size must be multiple of block_y_size and x_size must be multiple of block_x_size");
        }

        console.info("starting", this.currenctCalculation.id, this.currenctCalculation.backend.key, this.currenctCalculation.workers);
        this.currenctCalculation.backend.start(this.currenctCalculation);
    }

    listBackends() {
        return Object.keys(this.backends).sort();
    }

    reviveBackend() {
        if (this.selectedBackend && this.selectedBackend.state === BACKEND_OFFLINE) {
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
        this.store.state = CALCULATION_WAITING_COMPLETED;
        this.handleCalculationState();
    }

    onAborted({id}) {
        console.info("abort", id);
        if (id === undefined) {
            throw new Error();
        }
        if (!this.currenctCalculation || this.currenctCalculation.id !== id) return;
        this.currenctCalculation.abortTime = performance.now();
        this.currenctCalculation.onAborted(this.currenctCalculation);
        this.store.state = CALCULATION_WAITING_ABORTED;
        this.handleCalculationState();
    }

    // TODO Abort calculation on backend disconnect.
    
    onBackendChange(before, after) {
        if (before !== after) {
            this.selectedBackend = this.backends[after];
            this.store.max_workers = this.selectedBackend.max_workers;
            this.store.backend_state = this.selectedBackend.state;
        }
    }

    onBackendStateChange(backend) {
        if (this.selectedBackend && backend === this.selectedBackend.key) {
            this.store.max_workers = this.selectedBackend.max_workers;
            this.store.backend_state = this.selectedBackend.state;
        }
    }

    getElapsedTime() {
        const curr = this.currenctCalculation;
        if (!curr) return null;
        if (!curr.startTime) return null;
        if (curr.completeTime) return curr.completeTime - curr.startTime;
        if (curr.abortTime) return curr.abortTime - curr.startTime;
        return performance.now() - curr.startTime;
    }

}