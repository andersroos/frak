import {ColorMapper, INFINITE, NOT_CALCULATED} from "./color";

const SCREEN_UPDATE_DELAY_MS = 40;

const CPP = true;

export default class Gui {

    init(core) {
        this.core = core;

        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = core.x_size;
        this.context.canvas.height = core.y_size;
        
        if (CPP) {
            this.screen = new Module.Screen(core.x_size, core.y_size);
            this.screen.clear();
            this.imageBytesRef = this.screen.getImageBytesRef();
            console.info(this.imageBytesRef.length);
            console.info(this.imageBytesRef[0], this.imageBytesRef[1], this.imageBytesRef[2], this.imageBytesRef[3]);
            console.info("buffer", this.imageBytesRef.byteOffset, this.imageBytesRef.byteLength);
            const clameped = new Uint8ClampedArray(this.imageBytesRef.buffer, this.imageBytesRef.byteOffset, this.imageBytesRef.byteLength);
            console.info(clameped);
            this.bufferImage = new ImageData(clameped, this.core.x_size, this.core.y_size);
        }
        else {
            this.data = new Uint32Array(core.x_size * core.y_size);
            this.bufferBytes = new ArrayBuffer(4 * this.core.x_size * this.core.y_size);
            this.bufferMapped = new Uint32Array(this.bufferBytes);
            this.bufferImage = new ImageData(new Uint8ClampedArray(this.bufferBytes), this.core.x_size, this.core.y_size);
            this.colorMapper = new ColorMapper();
        }
       
        
        this.lastPaint = 0;
        this.paintDelayInProgress = false;
        this.clear();
        
        this.paintTime = 0;
        this.paintCount = 0;
    }
    
    clear() {
        if (CPP) {
            this.screen.clear();
        }
        else {
            this.data.fill(NOT_CALCULATED);
        }
        this.paint();
    }
    
    paint() {
        const now = Date.now();
        if (this.lastPaint + SCREEN_UPDATE_DELAY_MS <= now) {
            this.paintDelayInProgress = false;
            
            const paintStart = performance.now();
            if (CPP) {
                this.screen.mapColors();
            }
            else {
                for (let i = 0; i < this.data.length; ++i) {
                    this.bufferMapped[i] = this.colorMapper.mapColor(this.data[i]);
                }
            }
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
        let data;
        if (CPP) {
            data = this.screen.getDataBytesRef();
        }
        else {
            data = this.data;
        }
        const blockData = new Uint32Array(bytes);
        const targetOffset = y_start * this.core.y_size + x_start;
        for (let y = 0; y < y_size; ++y) {
            const sourceOffset = y * x_size;
            data.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * this.core.x_size);
        }
        this.paint();
    }
}
