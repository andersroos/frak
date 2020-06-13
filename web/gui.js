import {ColorMapper, INFINITE, NOT_CALCULATED} from "./color";

export default class Gui {

    init(core) {
        this.core = core;

        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = core.x_size;
        this.context.canvas.height = core.y_size;
        
        this.data = new Uint32Array(core.x_size * core.y_size);
        
        this.colorMapper = new ColorMapper();
        
        this.clear();
    }
    
    clear() {
        this.data.fill(NOT_CALCULATED);
        this.paintFractal();
    }
    
    paintFractal() {
        const bytes = new ArrayBuffer(4 * this.core.x_size * this.core.y_size);
        const mapped = new Uint32Array(bytes);
        for (let i = 0; i < this.data.length; ++i) {
            mapped[i] = this.colorMapper.mapColor(this.data[i]);
        }
        const image = new ImageData(new Uint8ClampedArray(bytes), this.core.x_size, this.core.y_size);
        this.context.putImageData(image, 0, 0);
    }
    
    putBlock({x_start, y_start, x_size, y_size, bytes}) {
        const blockData = new Uint32Array(bytes);
        console.info(blockData.length);
        const targetOffset = y_start * this.core.y_size + x_start;
        for (let y = 0; y < y_size; ++y) {
            const sourceOffset = y * x_size;
            this.data.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * this.core.x_size);
        }
        this.paintFractal();
    }
}
