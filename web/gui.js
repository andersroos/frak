import {ColorMapper, INFINITE, NOT_CALCULATED} from "./color";

export default class Gui {

    init(core) {
        this.core = core;

        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = core.x_size;
        this.context.canvas.height = core.y_size;
        
        this.data = new Uint32Array(core.x_size * core.y_size);
        this.bufferBytes = new ArrayBuffer(4 * this.core.x_size * this.core.y_size);
        this.bufferMapped = new Uint32Array(this.bufferBytes);
        this.bufferImage = new ImageData(new Uint8ClampedArray(this.bufferBytes), this.core.x_size, this.core.y_size);
        
        this.colorMapper = new ColorMapper();
        
        this.clear();
    }
    
    clear() {
        this.data.fill(NOT_CALCULATED);
        this.paintFractal();
    }
    
    paintFractal() {
        for (let i = 0; i < this.data.length; ++i) {
            this.bufferMapped[i] = this.colorMapper.mapColor(this.data[i]);
        }
        this.context.putImageData(this.bufferImage, 0, 0);
    }
    
    putBlock({x_start, y_start, x_size, y_size, bytes}) {
        const blockData = new Uint32Array(bytes);
        const targetOffset = y_start * this.core.y_size + x_start;
        for (let y = 0; y < y_size; ++y) {
            const sourceOffset = y * x_size;
            this.data.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * this.core.x_size);
        }
        this.paintFractal();
    }
}
