import {CONFIGURE, START, BLOCK_COMPLETE, FINISHED, BLOCK_STARTED} from './op';
import {MAX_N, X_SIZE, Y_SIZE} from "./dimensions";

export default class Core {
    
    constructor(screen) {
        this.screen = screen;
        
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onmessage(e);
        
        this.dispatcher.postMessage({op: CONFIGURE, worker_count: 24})
    }
    
    start() {
        this.id = Date.now();
        this.startTime = performance.now();
        this.dispatcher.postMessage({
            id: this.id,
            x_size: X_SIZE,
            y_size: Y_SIZE,
            max_n: MAX_N,
            op: START,
        });
    }
    
    onFinished() {
        console.info("finished in", performance.now() - this.startTime, "ms");
        this.screen.logStatistics();
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

