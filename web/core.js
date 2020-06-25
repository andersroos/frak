import {CONFIGURE, START, BLOCK_COMPLETE, FINISHED, BLOCK_STARTED, INTERRUPT} from './op';
import {X_SIZE, Y_SIZE} from "./dimensions";
import Gui from "./gui";

export default class Core {
    
    constructor() {
        this.gui = new Gui(this);
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onmessage(e);
        
        this.dispatcher.postMessage({op: CONFIGURE, worker_count: 24});

        this.max_n = 256 * 1024;

        // // Nice slow area:
        // this.x0_start = 0.01311636238095419;
        // this.x0_delta = 5.5964300526380535e-15;
        // this.y0_start = 0.6325883646614131;
        // this.y0_delta = 5.5964300526380535e-15;
        
        // // Broken histogram:
        // this.x0_start = 0.40286747167707915;
        // this.x0_delta = 1.4672303879337928e-11;
        // this.y0_start = -0.3501103227933188;
        // this.y0_delta = 1.4672303879337928e-11;
        
        // Full:
        this.x0_start = -2;
        this.x0_delta = 4 / X_SIZE;
        this.y0_start = -2;
        this.y0_delta = 4 / Y_SIZE;
        
        // this.colors.parse("00ff00-#90-ffffff-#90-ff0000-#90-00ff00");
        // this.colors.parse("000044-#32-0000ff-#64-ffff00-#64-ffffff");
        this.gui.colors.parse("9400d3-#32-4b0082-#32-0000ff-#32-00ff00-#32-ffff00-#32-ff7f00-#32-ff0000-#32-9400d3");
    }
    
    start() {
        this.gui.onEvent();
        this.gui.clear();
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
            max_n: this.max_n,
            op: START,
        });
    }
    
    getElapsedTime() {
        if (!this.startTime) return null;
        if (this.endTime) return this.endTime - this.startTime;
        return performance.now() - this.startTime;
    }
    
    interrupt() {
        this.gui.onEvent();
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
        this.gui.onFinished();
    }
    
    onBlockComplete(data) {
        if (data.id === this.id) {
            this.gui.putBlock(data);
        }
        this.gui.onEvent();
    }

    onBlockStarted(data) {
        if (data.id === this.id) {
            this.gui.startBlock(data);
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

