import {BLOCK_STARTED, BLOCK_COMPLETED, COMPLETED, ABORTED, ABORT, START} from "./op";
import {X_SIZE} from "./dimensions";

class Dispatcher {
    constructor() {
        this.workers = [];
        this.blocks = [];
    }

    createWorker() {
        const worker = new Worker("worker.js");
        worker.onmessage = e => this.onBlockCompleted(e.data);
        return worker;
    }

    setWorkerCount(worker_count) {
        if (worker_count !== this.workers.length) {
            console.info("dispatcher changing worker count to", worker_count);
            this.workers.slice(worker_count, this.workers.length).forEach(w => w.terminate());
            this.workers.length = worker_count;
            for (let i = 0; i < this.workers.length; ++i) {
                if (!this.workers[i]) {
                    this.workers[i] = this.createWorker();
                }
            }
        }
    }
    
    onStart({id, x_size, y_size, block_x_size, block_y_size, max_n, x0_start_index, x0_delta, y0_start_index, y0_delta, workers}) {
        this.setWorkerCount(workers);

        this.blocks = [];
        this.workingCount = 0;
        
        // create one block per line to start (ok we need common class, so we will need to build this js soon).
        for (let y = 0; y < y_size; y += block_y_size) {
            for (let x = 0; x < x_size; x += block_x_size) {
                this.blocks.push({
                    id,
                    x_start: x,
                    y_start: y,
                    x_size: block_x_size,
                    y_size: block_y_size,
                    x0_start_index: x0_start_index + x,
                    x0_delta,
                    y0_start_index: y0_start_index + y,
                    y0_delta,
                    max_n
                });
            }
        }
        this.workers.forEach((w, i) => this.postBlock(i));
    }
    
    onAbort({id}) {
        this.blocks = [];
        for (let i = 0; i < this.workers.length; ++i) {
            this.workers[i].terminate();
            this.workers[i] = this.createWorker();
        }
        postMessage({op: ABORTED, id});
    }
    
    postBlock(worker_index) {
        if (this.blocks.length > 0) {
            const block = this.blocks.shift();
            block.worker_index = worker_index;
            this.workers[worker_index].postMessage(block);
            this.workingCount++;
            postMessage({op: BLOCK_STARTED, id: block.id, x_start: block.x_start, x_size: block.x_size, y_start: block.y_start, y_size: block.y_size});
        }
    }
    
    onBlockCompleted(data) {
        this.workingCount--;
        this.postBlock(data.worker_index);
        postMessage(data, [data.bytes]);
        if (this.workingCount === 0) {
            postMessage({op: COMPLETED, id: data.id});
        }
    }
}

const dispatcher = new Dispatcher();

onmessage = function(event) {
    const params = event.data;
    switch (params.op) {
        case START: dispatcher.onStart(params); break;
        case ABORT: dispatcher.onAbort(params); break;
        default: throw new Error(`unkwnon op ${params.op}`);
    }
};
