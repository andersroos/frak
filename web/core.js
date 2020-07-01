import {CONFIGURE, START, BLOCK_COMPLETE, FINISHED, BLOCK_STARTED, INTERRUPT} from './op';
import {X_SIZE, Y_SIZE} from "./dimensions";
import Gui from "./gui";
import {CALCULATING} from "./colors";
import History from "./history";
import {calculateWeight} from "./util";

export default class Core {
    
    constructor() {
        this.screen = new Module.Screen(X_SIZE, Y_SIZE);
        this.history = new History(() => this.gui.onHistoryChanged(), data => this.startFromHistory(data));
        this.gui = new Gui(this, this.screen, this.history);
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onmessage(e);
    }

    // Setting max n will cause immediate recalculation.
    setMaxN(max_n) {
        console.info("changing max_n", max_n);
        this.interrupt().then(() => {
            this.configure({max_n});
            this.history.update({id: this.id, max_n});
            this.start();
        });
    }
    
    // Called by zoom event from gui.
    zoom(x, y, x_size, y_size) {
        console.info("zooming", x, y, x_size, y_size);
        this.gui.setKey(null);
        this.interrupt().then(() => {
            const x0_delta = this.x0_delta * x_size / X_SIZE;
            const y0_delta = this.y0_delta * y_size / Y_SIZE;
            this.configure({
                id: Date.now(),
                x0_start_index: Math.round((this.x0_start_index + x) * this.x0_delta / x0_delta),
                x0_delta,
                y0_start_index: Math.round((this.y0_start_index + y) * this.y0_delta / y0_delta),
                y0_delta,
            });
            this.screen.clear();
            this.pushHistory();
            this.start();
        });
    }
    
    // Start a calculation from history, take only coordinates and keep rest as is, updating history record with current max_n
    startFromHistory({x0_start_index, x0_delta, y0_start_index, y0_delta, id}) {
        console.info("starting from back/forward", id);
        this.gui.setKey(null);
        this.interrupt().then(() => {
            this.configure({id, x0_start_index, x0_delta, y0_start_index, y0_delta});
            this.history.update({id, max_n: this.max_n});
            this.start();
        });
    }

    startBenchmark01() {
        console.info("starting benchmark 01 (chrome-js with 1 worker takes ~1s)");
        this.gui.setKey(null);
        this.interrupt().then(() => {
            this.screen.clear();
            this.configure({benchmark: '01', id: Date.now(), x0_delta: 0.00014425531844608486 , y0_delta: 0.00014425531844608486, x0_start_index: -8410, y0_start_index: -2206, max_n: 2560});
            this.pushHistory();
            this.start();
        });
    }
    
    startBenchmark12() {
        console.info("starting benchmark 12 (chrome-js with 24 worker takes ~12s)");
        this.gui.setKey(null);
        this.interrupt().then(() => {
            this.screen.clear();
            this.configure({benchmark: '12', id: Date.now(), x0_delta: 4.000367762006723e-15, y0_delta: 4.000367762006723e-15, x0_start_index: 3278789141870, y0_start_index: 158132552379221, max_n: 262144});
            this.pushHistory();
            this.start();
        });
    }
    
    startBenchmark40() {
        console.info("starting benchmark 40 (chrome-js with 24 worker takes ~40s)");
        this.gui.setKey(null);
        this.interrupt().then(() => {
            this.screen.clear();
            this.configure({benchmark: '40', id: Date.now(), x0_delta: 2.3159865486788074e-16, y0_delta: 2.3159865486788074e-16, x0_start_index: 56634017984540, y0_start_index: 2731399131086267, max_n: 1048576});
            this.pushHistory();
            this.start();
        });
    }
    
    // Start a calculation from saved data, using data that affects looks but no other.
    startFromSaved({key, x0_start_index, x0_delta, y0_start_index, y0_delta, colors, color_cycle, color_scale, color_offset, max_n}) {
        console.info("starting from saved", key);
        this.gui.setKey(key);
        this.interrupt().then(() => {
            this.configure({
                id: Date.now(),
                x0_start_index,
                x0_delta,
                y0_start_index,
                y0_delta,
                max_n,
                colors,
                color_cycle,
                color_scale,
                color_offset,
            });
            this.gui.maxNInput.setValue(max_n);
            this.screen.clear();
            this.pushHistory();
            this.start();
        });
    }
    
    // Configure the next fractal run.
    configure({benchmark, x0_start_index, x0_delta, y0_start_index, y0_delta, max_n, id, colors, color_scale, color_offset, color_cycle}) {
        if (x0_start_index !== undefined && x0_delta !== undefined && y0_start_index !== undefined && y0_delta !== undefined) {
            this.x0_start_index = x0_start_index;
            this.x0_delta = x0_delta;
            this.y0_start_index = y0_start_index;
            this.y0_delta = y0_delta;
        }
        if (benchmark !== undefined) this.benchmark = benchmark;
        if (max_n !== undefined) this.max_n = max_n;
        if (id !== undefined) {
            if (this.endTime === null) {
                throw new Error('id can not be changed while running');
            }
            this.id = id;
        }
        if (colors !== undefined) this.gui.colorsInput.setKey(colors);
        if (color_scale !== undefined) this.gui.colorScaleInput.setValue(color_scale);
        if (color_offset !== undefined) this.gui.colorOffsetImput.setKey(color_offset);
        if (color_cycle !== undefined) this.gui.colorCycleInput.setKey(color_cycle);
    }

    // Push the current set coordinates and config to history (need color data and max_n since history data is used when saving).
    pushHistory() {
        this.history.push({
            id: this.id,
            colors: this.gui.colorsInput.getKey(),
            color_scale: this.gui.colorScaleInput.getValue(),
            color_offset: this.gui.colorOffsetImput.getKey(),
            color_cycle: this.gui.colorCycleInput.getKey(),
            x0_start_index: this.x0_start_index,
            x0_delta: this.x0_delta,
            y0_start_index: this.y0_start_index,
            y0_delta: this.y0_delta,
            max_n: this.max_n,
            benchmark: this.benchmark,
        });
    }
    
    start() {
        if (this.max_n === undefined || this.x0_start_index === undefined) {
            return;
        }
        
        this.startTime = performance.now();
        this.endTime = null;
        this.workersAtStart = this.gui.workerCountInput.getValue();
        this.backendAtStart = 'chrome*js';

        this.dispatcher.postMessage({op: CONFIGURE, worker_count: this.workersAtStart});
        
        console.info("starting", this.id, this.x0_start_index, this.x0_delta, this.y0_start_index, this.y0_delta, this.max_n, this.workersAtStart, this.backendAtStart);
        
        this.dispatcher.postMessage({
            id: this.id,
            x_size: X_SIZE,
            y_size: Y_SIZE,
            x0_start_index: this.x0_start_index,
            x0_delta: this.x0_delta,
            y0_start_index: this.y0_start_index,
            y0_delta: this.y0_delta,
            max_n: this.max_n,
            op: START,
        });
        
        this.gui.onEvent();
    }

    // Interrupt will return a promise that is resolved when workers are finished.
    interrupt() {
        if (!this.id) {
            return Promise.resolve();;
        }
        console.info("interrupting", this.id);
        this.dispatcher.postMessage({id: this.id, op: INTERRUPT});
        const done = Boolean(this.endTime);
        this.endTime = performance.now();
        this.benchmark = null;
        this.gui.onEvent();
        return new Promise(resolve => {
            if (done) {
                resolve();
            }
            else {
                this.interruptResolve = resolve;
            }
        });
    }
    
    getElapsedTime() {
        if (!this.startTime) return null;
        if (this.endTime) return this.endTime - this.startTime;
        return performance.now() - this.startTime;
    }
    
    onFinished() {
        const statistics = this.screen.getStatistics();
        this.endTime = performance.now();
        this.history.update({id: this.id, elapsed: this.endTime - this.startTime, weight: calculateWeight(statistics, this.max_n)});
        if (this.benchmark) {
            this.history.saveBenchmark();
            this.benchmark = null;
        }
        if (this.interruptResolve) {
            this.interruptResolve();
            this.interruptResolve = null;
        }
        this.gui.onFinished(statistics);
    }
    
    onBlockComplete({id, x_start, y_start, x_size, y_size, bytes}) {
        if (id === this.id) {
            const blockData = new Uint32Array(bytes);
            const targetOffset = y_start * X_SIZE + x_start;
            const screenData = this.screen.refData();
            for (let y = 0; y < y_size; ++y) {
                const sourceOffset = y * x_size;
                screenData.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * X_SIZE);
            }
        }
        this.gui.onEvent();
    }

    onBlockStarted({id, x_start, y_start, x_size, y_size}) {
        if (id === this.id) {
            // noinspection JSSuspiciousNameCombination
            this.screen.fillRect(x_start, x_size, y_start, y_size, CALCULATING);
        }
        this.gui.onEvent();
    }

    onmessage(event) {
        const params = event.data;
        switch (params.op) {
            case BLOCK_COMPLETE: this.onBlockComplete(params); break;
            case BLOCK_STARTED: this.onBlockStarted(params); break;
            case FINISHED: this.onFinished(params); break;
            default: throw new Error(`unkwnon op ${params.op}`);
        }
    }
}

