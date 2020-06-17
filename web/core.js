import {CONFIGURE, START, BLOCK_COMPLETE, FINISHED, BLOCK_STARTED, INTERRUPT} from './op';
import {MAX_N, X_SIZE, Y_SIZE} from "./dimensions";
import Screen from "./screen";
import Gui from "./gui";

export default class Core {
    
    constructor() {
        this.screen = new Screen(this.onSelectedZoom.bind(this));
        this.gui = new Gui(this, this.screen);
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onmessage(e);
        
        this.dispatcher.postMessage({op: CONFIGURE, worker_count: 24});
        
        // this.x0_start = 0.01311636238095419;
        // this.x0_delta = 5.5964300526380535e-15;
        // this.y0_start = 0.6325883646614131;
        // this.y0_delta = 5.5964300526380535e-15;
        
        this.x0_start = -2;
        this.x0_delta = 4 / X_SIZE;
        this.y0_start = -2;
        this.y0_delta = 4 / Y_SIZE;

        const paint = () => {
            this.screen.paint();
            this.gui.paint();
            requestAnimationFrame(paint);
        };
        paint();
    }
    
    start() {
        this.id = Date.now();
        
        this.startTime = performance.now();
        this.endTime = null;
        
        this.dispatcher.postMessage({
            id: this.id,
            x_size: X_SIZE,
            y_size: Y_SIZE,
            x0_start: this.x0_start,
            x0_delta: this.x0_delta,
            y0_start: this.y0_start,
            y0_delta: this.y0_delta,
            max_n: MAX_N,
            op: START,
        });
    }

    getElapsedTime() {
        if (!this.startTime) return null;
        if (this.endTime) return this.endTime - this.startTime;
        return performance.now() - this.startTime;
    }
    
    interrupt() {
        this.dispatcher.postMessage({id: this.id, op: INTERRUPT});
        this.endTime = performance.now();
    }
    
    onSelectedZoom(x, y, x_size, y_size) {
        this.interrupt();
        console.info("zoom", x, y, x_size, y_size);
        console.info(this.x0_start, this.x0_delta, this.y0_start, this.y0_delta);
        this.x0_start = this.x0_start + x * this.x0_delta;
        this.x0_delta = this.x0_delta * x_size / X_SIZE;
        this.y0_start = this.y0_start + y * this.y0_delta;
        this.y0_delta = this.y0_delta * y_size / Y_SIZE;
        console.info(this.x0_start, this.x0_delta, this.y0_start, this.y0_delta);
        this.start();
    }

    onFinished() {
        this.endTime = performance.now();
        this.screen.logStatistics();
        this.gui.onFinished();
    }
    
    onBlockComplete(data) {
        if (data.id === this.id) {
            this.screen.putBlock(data);
        }
    }

    onBlockStarted(data) {
        if (data.id === this.id) {
            this.screen.startBlock(data);
        }
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

