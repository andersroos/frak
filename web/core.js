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
        this.interrupt();
        this.configure({max_n});
        this.history.update({id: this.id, max_n});
        this.start();
    }
    
    // Called by zoom event from gui.
    zoom(x, y, x_size, y_size) {
        console.info("zooming", x, y, x_size, y_size);
        this.interrupt();
        this.configure({
            id: Date.now(),
            x0_start: this.x0_start + x * this.x0_delta,
            x0_delta: this.x0_delta * x_size / X_SIZE,
            y0_start: this.y0_start + y * this.y0_delta,
            y0_delta: this.y0_delta * y_size / Y_SIZE,
        });
        this.screen.clear();
        this.pushHistory();
        this.start();
    }

    // Start a calculation from history, take only coordinates and keep rest as is.
    startFromHistory({x0_start, x0_delta, y0_start, y0_delta, id}) {
        console.info("starting from back/forward", id);
        this.interrupt();
        this.configure({id, x0_start, x0_delta, y0_start, y0_delta});
        this.history.update({
            id,
            max_n: this.max_n,
            workers: this.gui.workerCountInput.getValue(),
        });
        this.start();
    }
    
    // Start a calculation from saved data.
    startFromSaved({key, x0_start, x0_delta, y0_start, y0_delta, colors, max_n}) {
        console.info("starting from saved", key);
        this.interrupt();
        this.configure({
            id: Date.now(),
            key,
            x0_start,
            x0_delta,
            y0_start,
            y0_delta,
            max_n,
        });
        this.gui.colorsInput.setKey(colors);
        this.start();
    }
    
    // Configure the next fractal run.
    configure({x0_start, x0_delta, y0_start, y0_delta, workers, max_n, id}) {
        if (x0_start !== undefined && x0_delta !== undefined && y0_start !== undefined && y0_delta !== undefined) {
            this.x0_start = x0_start;
            this.x0_delta = x0_delta;
            this.y0_start = y0_start;
            this.y0_delta = y0_delta;
        }
        if (max_n !== undefined) {
            this.max_n = max_n;
        }
        if (workers) {
            this.gui.workerCountInput.setValue(workers);
        }
        if (id !== undefined) {
            if (this.endTime === null) {
                throw new Error('id can not be changed while running');
            }
            this.id = id;
        }
    }

    // Push the current set coordinates and config to history.
    pushHistory() {
        this.history.push({
            id: this.id,
            workers: this.gui.workerCountInput.getValue(),
            type: 'chrome*js',
            colors: this.gui.colorsInput.getKey(),
            x0_start: this.x0_start,
            x0_delta: this.x0_delta,
            y0_start: this.y0_start,
            y0_delta: this.y0_delta,
            max_n: this.max_n,
        });
    }
    
    start() {
        if (this.max_n === undefined || this.x0_start === undefined) {
            return;
        }
        
        this.startTime = performance.now();
        this.endTime = null;

        this.dispatcher.postMessage({op: CONFIGURE, worker_count: this.gui.workerCountInput.getValue()});
        
        console.info("starting", this.id, this.x0_start, this.x0_delta, this.y0_start, this.y0_delta, this.max_n);
        
        this.dispatcher.postMessage({
            id: this.id,
            x_size: X_SIZE,
            y_size: Y_SIZE,
            x0_start: this.x0_start,
            x0_delta: this.x0_delta,
            y0_start: this.y0_start,
            y0_delta: this.y0_delta,
            max_n: this.max_n,
            op: START,
        });
        
        this.gui.onEvent();
    }

    interrupt() {
        if (!this.id) {
            return;
        }
        console.info("interrupting", this.id);
        this.dispatcher.postMessage({id: this.id, op: INTERRUPT});
        this.endTime = performance.now();
        this.gui.onEvent();
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

