import {CONFIGURE, START, BLOCK_COMPLETE, FINISHED, BLOCK_STARTED, INTERRUPT} from './op';
import {X_SIZE, Y_SIZE} from "./dimensions";
import Screen from "./screen";
import Gui from "./gui";
import Colors from "./colors";

export default class Core {
    
    constructor() {
        this.screen = new Screen(this);
        this.colors = new Colors(this.screen.screen);
        this.gui = new Gui(this, this.screen);
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onmessage(e);
        
        this.dispatcher.postMessage({op: CONFIGURE, worker_count: 24});

        this.max_n = 256 * 1024;
        
        // Nice slow area:
        this.x0_start = 0.01311636238095419;
        this.x0_delta = 5.5964300526380535e-15;
        this.y0_start = 0.6325883646614131;
        this.y0_delta = 5.5964300526380535e-15;
        
        // // Broken histogram:
        // this.x0_start = 0.40286747167707915;
        // this.x0_delta = 1.4672303879337928e-11;
        // this.y0_start = -0.3501103227933188;
        // this.y0_delta = 1.4672303879337928e-11;
        
        // // Full:
        // this.x0_start = -2;
        // this.x0_delta = 4 / X_SIZE;
        // this.y0_start = -2;
        // this.y0_delta = 4 / Y_SIZE;

        this.lastEvent = performance.now();
        
        const paint = () => {
            if (this.lastEvent + 30000 < performance.now()) {
                // Stop animating after 30s of no events.
                return;
            }

            const statistics = this.screen.getStatistics();
            this.colors.setScreenColors(statistics.minDepth || 0, statistics.maxDepth || 0, statistics.histogram || 0, statistics.histogramBucketSize || 0);
            this.screen.paint();
            this.gui.paint(statistics);
            requestAnimationFrame(paint);
        };
        paint();
    }
    
    start() {
        this.onEvent();
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
    
    onEvent() {
        this.lastEvent = performance.now();
    }

    getElapsedTime() {
        if (!this.startTime) return null;
        if (this.endTime) return this.endTime - this.startTime;
        return performance.now() - this.startTime;
    }
    
    interrupt() {
        this.onEvent();
        this.dispatcher.postMessage({id: this.id, op: INTERRUPT});
        this.endTime = performance.now();
    }
    
    onSelectedZoom(x, y, x_size, y_size) {
        this.interrupt();
        this.screen.clear();
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
        this.onEvent();
        this.endTime = performance.now();
        this.screen.logStatistics();
        this.gui.onFinished();
    }
    
    onBlockComplete(data) {
        this.onEvent();
        if (data.id === this.id) {
            this.screen.putBlock(data);
        }
    }

    onBlockStarted(data) {
        this.onEvent();
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

