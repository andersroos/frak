import { X_SIZE, Y_SIZE } from "./dimensions";
import {CALCULATING} from "./color";

class MouseState {
    
    constructor(canvas, onMouseEvent, onMouseRect) {
        canvas.addEventListener("mousemove", e => this.mouseMove(e));
        canvas.addEventListener("mouseout", e => this.mouseOut(e));
        canvas.addEventListener("mousedown", e => this.mouseDown(e));
        canvas.addEventListener("mouseup", e => this.mouseUp(e));
        this.onMouseEvent = onMouseEvent;
        this.onMouseRect = onMouseRect;
    }
    
    mouseMove(e) {
        this.hover = {x: e.offsetX, y: e.offsetY};
        if (this.onMouseEvent) this.onMouseEvent();
    }
    
    mouseOut(e) {
        this.hover = null;
        if (this.onMouseEvent) this.onMouseEvent();
    }
    
    mouseDown() {
        this.down = this.hover;
        if (this.onMouseEvent) this.onMouseEvent();
    }

    mouseUp() {
        this.up = this.hover;
        if (this.down && this.up && this.onMouseRect) this.onMouseRect(this.down, this.up);
        this.down = null;
        this.up = null;
        if (this.onMouseEvent) this.onMouseEvent();
    }
    
}


// Handle screen data and painting of canvas.
export default class Screen {
    
    constructor(onSelectedZoom) {
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
        
        this.lastEvent = performance.now();
        
        this.mouseState = new MouseState(this.context.canvas, () => this.onMouseEvent(), (start, end) => this.onMouseRect(start, end));
        this.onSelectedZoom = onSelectedZoom;
        
        requestAnimationFrame(this.paint.bind(this));
    }

    // Paint the canvas if dirty.
    paint() {
        if (performance.now() < this.lastEvent + 30000) {
            // Request the screen to be painted to image data, then copy image to canvas.
            const start = performance.now();
            const time = Math.floor(performance.now());
            this.screen.paint(time);
            this.context.putImageData(this.imageData, 0, 0);
            this.paintTime += performance.now() - start;
            this.paintCount++;

            const hover = this.mouseState.hover;
            const down = this.mouseState.down;
            if (hover || down) {
                const col = Math.floor(Math.random() * 0x1000000).toString(16);

                if (down) {
                    if (hover) {
                        this.context.lineWidth = 1;
                        this.context.strokeStyle = '#' + col.padStart(6, '0');
                        this.context.strokeRect(down.x, down.y, hover.x - down.x, hover.y - down.y);
                    }
                }
                else if (hover) {
                    this.context.fillStyle = '#' + col.padStart(6, '0');
                    this.context.fillRect(0, hover.y, X_SIZE, 1);
                    this.context.fillRect(hover.x, 0, 1, Y_SIZE);
                }
            }
        }
        requestAnimationFrame(this.paint.bind(this));
    }
    
    // Message when a block is started.
    startBlock({x_start, y_start, x_size, y_size}) {
        this.lastEvent = performance.now();
        // noinspection JSSuspiciousNameCombination
        this.screen.fillRect(x_start, x_size, y_start, y_size, CALCULATING);
    }
    
    // Put a calculated block into the screen data.
    putBlock({x_start, y_start, x_size, y_size, bytes}) {
        this.lastEvent = performance.now();
        const blockData = new Uint32Array(bytes);
        const targetOffset = y_start * X_SIZE + x_start;
        for (let y = 0; y < y_size; ++y) {
            const sourceOffset = y * x_size;
            this.screenData.set(blockData.subarray(sourceOffset, sourceOffset + x_size), targetOffset + y * X_SIZE);
        }
    }
    
    onMouseRect(start, end) {
        console.info("rect", start, end);
        if (this.onSelectedZoom) {
            this.onSelectedZoom(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.max(1, Math.abs(start.x - end.x)), Math.max(1, Math.abs(start.y - end.y)));
        }
    }
    
    onMouseEvent() {
        this.lastEvent = performance.now();
        // console.info(this.mouseState.hover);
    }
    
    logStatistics() {
        console.info("screen paint average", this.paintTime / this.paintCount, "ms");
        this.paintCount = 0;
        this.paintTime = 0;
    }
}