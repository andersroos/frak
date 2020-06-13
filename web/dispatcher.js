
import op from "./op";

class Dispatcher {
    constructor() {
        this.workers = [];
        this.blocks = [];
    }
    
    onConfigure(params) {
        const {worker_count=0} = params;
        if (worker_count !== this.workers.length) {
            console.info("dispatcher changing worker count to", worker_count);
            this.workers.slice(worker_count, this.workers.length).forEach(w => w.terminate());
            this.workers.length = worker_count;
            for (let i = 0; i < this.workers.length; ++i) {
                if (!this.workers[i]) {
                    const worker = new Worker('worker.js');
                    worker.onmessage = e => this.onBlockComplete(e.data);
                    this.workers[i] = worker;
                }
            }
        }
    }
    
    onStart(params) {
        const {id, x_size, y_size, max_n} = params;

        this.blocks = [];
        this.id = null;
        
        console.info(`starting id=${id}, max_n=${max_n}, y_size=${y_size}`);
        
        const x0_start = -2;
        const y0_start = -2;
        const x0_delta = 4 / x_size;
        const y0_delta = 4 / y_size;
        
        // create one block per line to start (ok we need common class, so we will need to build this js soon).
        for (let y = 0; y < y_size; ++y) {
            this.blocks.push({
                id,
                x_start: 0,
                y_start: y,
                x_size,
                y_size: 1,
                x0_start,
                x0_delta,
                y0_start: y0_start + y0_delta * y,
                y0_delta,
                max_n
            });
        }
        console.info("start", this.workers);
        this.workers.forEach((w, i) => this.postBlock(i));
    }
    
    postBlock(worker_index) {
        if (this.blocks.length > 0) {
            const block = this.blocks.shift();
            block.worker_index = worker_index;
            this.workers[worker_index].postMessage(block);
        }
    }
    
    onBlockComplete(data) {
        this.postBlock(data.worker_index);
        postMessage(data, [data.bytes]);
    }
}

const dispatcher = new Dispatcher();

onmessage = function(event) {
    const params = event.data;
    console.info("dispatcher got event", event);
    switch (params.op) {
        case op.CONFIGURE: dispatcher.onConfigure(params); break;
        case op.START: dispatcher.onStart(params); break;
        default: throw new Error(`unkwnon op ${params.op}`);
    }
};
