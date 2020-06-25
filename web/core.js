import {CONFIGURE, START, BLOCK_COMPLETE, FINISHED, BLOCK_STARTED, INTERRUPT} from './op';
import {X_SIZE, Y_SIZE} from "./dimensions";
import Gui from "./gui";
import {CALCULATING} from "./colors";

export default class Core {
    
    constructor() {
        this.screen = new Module.Screen(X_SIZE, Y_SIZE);
        this.gui = new Gui(this, this.screen);
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onmessage(e);
        
        this.dispatcher.postMessage({op: CONFIGURE, worker_count: 24});
    }
    
    setMaxN(max_n) {
        this.max_n = max_n;
    }
    
    setCoordinates(x0_start, x0_delta, y0_start, y0_delta) {
        this.x0_start = x0_start;
        this.x0_delta = x0_delta;
        this.y0_start = y0_start;
        this.y0_delta = y0_delta;
    }
    
    start() {
        if (this.max_n === undefined || this.x0_start === undefined) {
            return;
        }
        
        this.interrupt();
        this.id = Date.now();
        
        this.startTime = performance.now();
        this.endTime = null;

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
    
    getElapsedTime() {
        if (!this.startTime) return null;
        if (this.endTime) return this.endTime - this.startTime;
        return performance.now() - this.startTime;
    }
    
    interrupt() {
        console.info("interrupting", this.id);
        this.dispatcher.postMessage({id: this.id, op: INTERRUPT});
        this.endTime = performance.now();
        this.gui.onEvent();
    }
    
    zoom(x, y, x_size, y_size) {
        console.info("zooming", x, y, x_size, y_size);
        this.setCoordinates(
            this.x0_start + x * this.x0_delta,
            this.x0_delta * x_size / X_SIZE,
            this.y0_start + y * this.y0_delta,
            this.y0_delta * y_size / Y_SIZE
        );
        this.screen.clear();
        this.start();
    }

    onFinished() {
        this.endTime = performance.now();
        this.gui.onFinished();
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

