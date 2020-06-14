import op from './op';

export default class Core {
    
    constructor(gui) {
        this.gui = gui;
        this.x_size = 800;
        this.y_size = 800;
        this.max_n = 64 * 200;
        
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onmessage(e);
        
        this.dispatcher.postMessage({op: op.CONFIGURE, worker_count: 24})
    }
    
    start() {
        this.id = Date.now();
        this.startTime = Date.now();
        this.gui.clear();
        this.dispatcher.postMessage({
            id: this.id,
            x_size: this.x_size,
            y_size: this.y_size,
            max_n: this.max_n,
            op: op.START,
        });
    }
    
    onFinished() {
        console.info("finished in", Date.now() - this.startTime, "ms");
    }
    
    onBlockComplete(data) {
        if (data.id === this.id) {
            this.gui.putBlock(data);
        }
    }
    
    onmessage(event) {
        const params = event.data;
        switch (params.op) {
            case op.BLOCK_COMPLETE: this.onBlockComplete(params); break;
            case op.FINISHED: this.onFinished(params); break;
            default: throw new Error(`unkwnon op ${params.op}`);
        }
    }
}

