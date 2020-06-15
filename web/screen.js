import { X_SIZE, Y_SIZE } from "./dimensions";
import {CALCULATING} from "./color";

// Handle screen data and painting of canvas.
export default class Screen {
    
    constructor() {
        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = X_SIZE;
        this.context.canvas.height = Y_SIZE;
        
        this.screen = new Module.Screen(X_SIZE, Y_SIZE);
        this.screen.clear();
        
        this.imageBytesRef = this.screen.refImageBytes();
        const uint8ClampedArray = new Uint8ClampedArray(this.imageBytesRef.buffer, this.imageBytesRef.byteOffset, this.imageBytesRef.byteLength);
        this.imageData = new ImageData(uint8ClampedArray, X_SIZE, Y_SIZE);

        this.screenData = this.screen.refData();
        
        this.paintTime = 0;
        this.paintCount = 0;
        
        requestAnimationFrame(this.paint.bind(this));
    }

    // Paint the canvas if dirty.
    paint() {
        // Request the screen to be painted to image data, then copy image to canvas.
        const start = performance.now();
        this.screen.paint(Math.floor(performance.now()));
        this.context.putImageData(this.imageData, 0, 0);
        this.paintTime += performance.now() - start;
        this.paintCount++;
        requestAnimationFrame(this.paint.bind(this));
    }
    
    // Message when a block is started.
    startBlock({x_start, y_start, x_size, y_size}) {
        // noinspection JSSuspiciousNameCombination
        this.screen.fillRect(x_start, x_size, y_start, y_size, CALCULATING);
    }
    
    // Put a calculated block into the screen data.
    putBlock({x_start, y_start, x_size, y_size, bytes}) {
        const blockData = new Uint32Array(bytes);
        const targetOffset = y_start * X_SIZE + x_start;
        for (let y = 0; y < y_size; ++y) {
            const sourceOffset = y * x_size;
            this.screenData.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * X_SIZE);
        }
    }

    logStatistics() {
        console.info("screen paint average", this.paintTime / this.paintCount, "ms");
        this.paintCount = 0;
        this.paintTime = 0;
    }
    
}