import {ColorMapper, INFINITE, NOT_CALCULATED} from "./color";

const SCREEN_UPDATE_DELAY_MS = 40;

export default class Gui {

    init(core) {
        this.core = core;

        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = core.x_size;
        this.context.canvas.height = core.y_size;
        
        this.screen = new Module.Screen(core.x_size, core.y_size);
        this.screen.clear();
        this.imageBytesRef = this.screen.refImageBytes();
        const uint8ClampedArray = new Uint8ClampedArray(this.imageBytesRef.buffer, this.imageBytesRef.byteOffset, this.imageBytesRef.byteLength);
        this.bufferImage = new ImageData(uint8ClampedArray, this.core.x_size, this.core.y_size);
        
        this.lastPaint = 0;
        this.paintDelayInProgress = false;
        this.clear();
        
        this.paintTime = 0;
        this.paintCount = 0;
    }
    
    clear() {
        this.screen.clear();
        this.paint();
    }
    
    paint() {
        const now = Date.now();
        if (this.lastPaint + SCREEN_UPDATE_DELAY_MS <= now) {
            this.paintDelayInProgress = false;
            
            const paintStart = performance.now();
            this.screen.paint(Math.floor(performance.now()));
            this.context.putImageData(this.bufferImage, 0, 0);
            this.paintTime += performance.now() - paintStart;
            this.paintCount++;
            
            this.lastPaint = Date.now();
        }
        else if (!this.paintDelayInProgress) {
            this.paintDelayInProgress = true;
            setTimeout(this.paint.bind(this), SCREEN_UPDATE_DELAY_MS);
        }
    }
    
    putBlock({x_start, y_start, x_size, y_size, bytes}) {
        const data = this.screen.refDataBytes();
        const blockData = new Uint32Array(bytes);
        const targetOffset = y_start * this.core.y_size + x_start;
        for (let y = 0; y < y_size; ++y) {
            const sourceOffset = y * x_size;
            data.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * this.core.x_size);
        }
        this.paint();
    }
}
