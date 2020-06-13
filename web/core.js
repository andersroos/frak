import op from './op';

export default class Core {
    
    constructor(gui) {
        this.gui = gui;
        this.x_size = 800;
        this.y_size = 800;
        this.max_n = 64;
        
        this.dispatcher = new Worker('dispatcher.js');
        this.dispatcher.onmessage = e => this.onBlockComplete(e);
        
        this.dispatcher.postMessage({op: op.CONFIGURE, worker_count: 24})
    }
    
    start() {
        this.gui.clear();
        this.dispatcher.postMessage({
            x_size: this.x_size,
            y_size: this.y_size,
            max_n: this.max_n,
            op: op.START,
        });
    }
    
    onBlockComplete(event) {
        this.gui.putBlock(event.data);
    }
}
