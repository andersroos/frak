import {X_SIZE, Y_SIZE} from "./dimensions";
import Gui from "./gui";
import {CALCULATING} from "./colors";
import History from "./history";
import Store, {BACKEND_ONLINE} from "./store";
import {Backends} from "./backends";
import Benchmark from "./benchmark";
import {calculateWeight} from "./util";


export default class Core {
    
    constructor() {
        this.store = new Store();
        this.backends = new Backends(this.store, this);
        this.benchmark = new Benchmark(this.store);
        this.screen = new Module.Screen(X_SIZE, Y_SIZE);
        this.history = new History(data => this.startFromHistory(data));
        this.gui = new Gui(this, this.store, this.screen, this.backends.listBackends());
    }

    // Setting max n will cause immediate recalculation.
    startFromNewMaxN() {
        const max_n = Math.round(this.store.max_n);
        console.info("changing max_n", max_n);
        const {x0_delta, y0_delta, x0_start_index, y0_start_index} = this.store.coordinates;
        this.backends.requestCalculation({
            x0_delta,
            y0_delta,
            x0_start_index,
            y0_start_index,
            max_n,
            onBeforeStart: () => {
                this.screen.clearInProgress();
                this.history.update({max_n});
            },
        });
    }
    
    // Called by zoom event from gui.
    startFromZoom(x, y, x_size, y_size) {
        console.info("zooming", x, y, x_size, y_size);
        const {x0_delta, y0_delta, x0_start_index, y0_start_index} = this.store.coordinates;
        const new_x0_delta = x0_delta * x_size / X_SIZE;
        const new_y0_delta = y0_delta * y_size / Y_SIZE;
        this.backends.requestCalculation({
            x0_delta: new_x0_delta,
            y0_delta: new_y0_delta,
            x0_start_index: Math.round((x0_start_index + x) * x0_delta / new_x0_delta),
            y0_start_index: Math.round((y0_start_index + y) * y0_delta / new_y0_delta),
            max_n: this.store.max_n,
            onBeforeStart: () => {
                this.screen.clear();
                this.pushHistory();
            },
        });
    }
    
    // Start a calculation from history, take only coordinates and keep rest as is, updating history record with current max_n
    startFromHistory({x0_start_index, x0_delta, y0_start_index, y0_delta, max_n, historyId}) {
        console.info("starting from back/forward", historyId);
        this.backends.requestCalculation({
            x0_delta,
            y0_delta,
            x0_start_index,
            y0_start_index,
            max_n,
            onBeforeStart: () => {
                this.screen.clear();
            },
        });
    }

    startBenchmark00() {
        console.info("starting benchmark 00 (chrome-js with 1 worker takes ~0s)");
        const max_n = 32;
        this.store.max_n = max_n;
        this.backends.requestCalculation({
            x0_delta: 4 / X_SIZE,
            y0_delta: 4 / Y_SIZE,
            x0_start_index: -0.5 * X_SIZE,
            y0_start_index: -0.5 * Y_SIZE,
            max_n,
            not_really_a_benchmark: "00",
            onBeforeStart: () => {
                this.store.color_scale = 80.63492856264527;
                this.screen.clear();
                this.pushHistory();
            },
        });
    }

    startBenchmark01() {
        console.info("starting benchmark 01 (chrome-js with 1 worker takes ~1s)");
        const max_n = 2560;
        this.store.max_n = max_n;
        this.backends.requestCalculation({
            x0_delta: 0.00014425531844608486,
            y0_delta: 0.00014425531844608486,
            x0_start_index: -8410,
            y0_start_index: -2206,
            max_n,
            benchmark: "01",
            onBeforeStart: () => {
                this.store.color_scale = 512;
                this.screen.clear();
                this.pushHistory();
            },
        });
    }
    
    startBenchmark12() {
        console.info("starting benchmark 12 (chrome-js with 24 worker takes ~12s)");
        const max_n = 262144;
        this.store.max_n = max_n;
        this.backends.requestCalculation({
            x0_delta: 4.000367762006723e-15,
            y0_delta: 4.000367762006723e-15,
            x0_start_index: 3278789141870,
            y0_start_index: 158132552379221,
            max_n,
            benchmark: '12',
            onBeforeStart: () => {
                this.store.color_scale = 208064;
                this.screen.clear();
                this.pushHistory();
            },
        });
    }
    
    startBenchmark40() {
        console.info("starting benchmark 40 (chrome-js with 24 worker takes ~40s)");
        const max_n = 1048576;
        this.store.max_n = max_n;
        this.backends.requestCalculation({
            x0_delta: 2.3159865486788074e-16,
            y0_delta: 2.3159865486788074e-16,
            x0_start_index: 56634017984540,
            y0_start_index: 2731399131086267,
            max_n,
            benchmark: '40',
            onBeforeStart: () => {
                this.store.color_scale = 1048576;
                this.screen.clear();
                this.pushHistory();
            },
        });
    }

    pushHistory() {
        const data = Object.assign({max_n: this.store.max_n}, this.store.coordinates);
        this.history.push(data);
    }
    
    getElapsedTime() {
        return this.backends.getElapsedTime();
    }
    
    onAborted() {
        const statistics = this.screen.getStatistics();
        this.gui.onFinished(statistics);
        statistics.histogram.delete();
    }

    onCompleted({benchmark, backend, startTime, completeTime, hardware, id, workers, max_n}) {
        const statistics = this.screen.getStatistics();
        if (benchmark) {
            const elapsed = completeTime - startTime;
            const weight = calculateWeight(statistics, max_n);
            const speed = weight / elapsed;
            const worker_speed = weight / workers / elapsed;
            this.benchmark.saveBenchmark({
                id,
                benchmark,
                backend: backend.key,
                hardware,
                workers,
                speed,
                worker_speed,
                weight,
                elapsed,
            });
        }
        this.gui.onFinished(statistics);
    }
    
    onBlockCompleted({x_start, y_start, x_size, y_size, bytes}) {
        const blockData = new Uint32Array(bytes);
        const targetOffset = y_start * X_SIZE + x_start;
        const screenData = this.screen.refData();
        for (let y = 0; y < y_size; ++y) {
            const sourceOffset = y * x_size;
            screenData.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * X_SIZE);
        }
        this.gui.onEvent();
    }

    onBlockStarted({x_start, y_start, x_size, y_size}) {
        // noinspection JSSuspiciousNameCombination
        this.screen.fillRect(x_start, x_size, y_start, y_size, CALCULATING);
        this.gui.onEvent();
    }

}

