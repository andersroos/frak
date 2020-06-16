import { X_SIZE, Y_SIZE } from "./dimensions";
import {CALCULATING} from "./color";


const asRectWithAspectRatio = (first, second, ratio) => {
    // Always keep th first point fixed and alter the second.
    let x = first.x;
    let y = first.y;
    let dx = second.x - x;
    let dy = second.y - y;
    
    // Fix aspect ratio to match ratio dx/dy.
    if (Math.abs(dx * ratio) > Math.abs(dy)) {
       dy = dx * ratio;
    }
    else {
        dx = dy / ratio;
    }

    // Now shift rect so dx and dy are positive.
    if (dx < 0) {
        x += dx;
        dx = -dx;
    }
    if (dy < 0) {
        y += dy;
        dy = -dy;
    }
    return {x, y, dx, dy};
};


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
        if (this.down && (e.buttons & 1) === 0) {
            // Button was down but released outside canvas.
            this.down = null;
        }
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
        // this.screen.setFlags("0x000000-#62-0xffffff");
        this.screen.setFlags("cycle:wrap:stretch");
        this.screen.removeGradients();
        this.screen.addGradient(0x00ff80, 1024, 0xffffff);
        this.screen.addGradient(0xffffff, 1024, 0xff0000);
        this.screen.addGradient(0xff0000, 1024 , 0x00ff80);
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
    
    setColorSpec(spec) {
    
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
                        const {x, y, dx, dy} = asRectWithAspectRatio(down, hover, X_SIZE / Y_SIZE);
                        this.context.lineWidth = 1;
                        this.context.strokeStyle = '#' + col.padStart(6, '0');
                        this.context.strokeRect(x, y, dx, dy);
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
        const {x, y, dx, dy} = asRectWithAspectRatio(start, end, X_SIZE / Y_SIZE);
        console.info("rect", start, end);
        if (this.onSelectedZoom) {
            this.onSelectedZoom(x, y, dx, dy);
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