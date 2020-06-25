import {formatInt} from "./util";
import {HISTOGRAM_SIZE, X_SIZE, Y_SIZE} from "./dimensions";
import Colors, {CALCULATING} from "./colors";

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


class WheelSelectLocalStorage {
    
    constructor(key, options, onSelect) {
        this.key = key;
        this.options = options;
        this.selected = Number.parseInt(localStorage.getItem(key)) || 0;
        this.onSelect = onSelect;

        const element = document.getElementById(key);
        element.onwheel = this.onWheel.bind(this);
        
        this.element = element.getElementsByClassName("value")[0];
        
        this.onSelectedChanged();
    }
    
    onWheel(event) {
        if (event.deltaY > 0) {
            this.selected = Math.max(0, this.selected - 1);
        }
        else {
            this.selected = Math.min(this.selected + 1, this.options.length - 1);
        }
        this.onSelectedChanged()
    }
    
    onSelectedChanged() {
        const option = this.options[this.selected];
        this.element.textContent = option.label;
        localStorage.setItem(this.key, this.selected.toString());
        this.onSelect(option.value);
    }
}

export default class Gui {
    
    constructor(core) {
        this.screen = new Module.Screen(X_SIZE, Y_SIZE);
        this.colors = new Colors(this.screen);
        this.core = core;

        // Init canvas and screen.
        
        this.screen.clear();
        
        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = X_SIZE;
        this.context.canvas.height = Y_SIZE;
        
        this.imageBytesRef = this.screen.refImageBytes();
        const uint8ClampedArray = new Uint8ClampedArray(this.imageBytesRef.buffer, this.imageBytesRef.byteOffset, this.imageBytesRef.byteLength);
        this.imageData = new ImageData(uint8ClampedArray, X_SIZE, Y_SIZE);

        this.screenData = this.screen.refData();
        
        this.paintTime = 0;
        this.paintCount = 0;
        
        // TODO Rename.
        this.mouseState = new MouseState(this.context.canvas, () => this.onMouseEvent(), (start, end) => this.onMouseRect(start, end));
        
        // Elapsed.
        
        this.elapsed = document.getElementById('elapsed');
        
        // Histogram.
        
        const svg = document.getElementById('histogram');
        svg.setAttribute("height", HISTOGRAM_SIZE * 2);
        for (let i = 0; i < HISTOGRAM_SIZE; ++i) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute("id", `histogram${i}`);
            rect.setAttribute("y", i * 2);
            rect.setAttribute("height", 1);
            rect.setAttribute("width", 0);
            rect.setAttribute("fill", "#00ff00");
            svg.appendChild(rect);
        }
        
        // Color cycle.

        this.colorCycle = new WheelSelectLocalStorage(
            'color-cycle',
            [
                {value: 0,  label: ' OFF'},
                {value: 10, label: '10 S'},
                {value: 6,  label: ' 6 S'},
                {value: 4,  label: ' 4 S'},
                {value: 2,  label: ' 2 S'},
                {value: 1,  label: ' 1 S'},
            ],
            v => {
                this.colors.setCycleTime(v * 1000);
                this.onEvent();
            }
        );
        
        // Color scaling.

        this.colorScaling = new WheelSelectLocalStorage(
            'color-scaling',
            [
                {value: 0,     label: ' OFF'},
                {value: 0.2,   label: ' 20.0%'},
                {value: 0.4,   label: ' 40.0%'},
                {value: 0.6,   label: ' 60.0%'},
                {value: 0.8,   label: ' 80.0%'},
                {value: 0.9,   label: ' 90.0%'},
                {value: 0.94,  label: ' 94.0%'},
                {value: 0.98,  label: ' 98.0%'},
                {value: 0.99,  label: ' 99.0%'},
                {value: 0.991, label: ' 99.1%'},
                {value: 0.992, label: ' 99.2%'},
                {value: 0.993, label: ' 99.3%'},
                {value: 0.994, label: ' 99.4%'},
                {value: 0.996, label: ' 99.6%'},
                {value: 0.998, label: ' 99.8%'},
                {value: 0.999, label: ' 99.9%'},
                {value: 1.0,   label: '100.0%'},
                {value: 1.1,   label: '110.0%'},
                {value: 1.2,   label: '120.0%'},
                {value: 1.4,   label: '140.0%'},
            ],
            v => {
                this.colors.setScaleRatio(v);
                this.onEvent();
            }
        );

        // Setup paint loop.
        
        this.lastEvent = performance.now();
        const paint = () => {
            if (performance.now() < this.lastEvent + 30000) {
                const statistics = this.screen.getStatistics();
                this.colors.setScreenColors(statistics);
                this.paint(statistics);
            }
            requestAnimationFrame(paint);
        };
        setTimeout(paint, 0);
        
    }

    onEvent() {
        this.lastEvent = performance.now();
    }
    
    paint(statistics) {
        const startTime = performance.now();
        const time = Math.floor(startTime);

        // Canvas.
        
        this.screen.paint(time);
        this.context.putImageData(this.imageData, 0, 0);
        
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

        // Statistics and histogram.
        
        const elapsed = this.core.getElapsedTime();
    
        this.elapsed.textContent = formatFloat(elapsed ? (elapsed / 1000) : 0, {padTo: 7, dec: 2});
        document.getElementById("weight").textContent = formatFloat(statistics.infiniteCount * this.core.max_n + statistics.sumDepth, {human: true, dec: 4, padTo: 9});
        
        const format = number => formatInt(number, {space: 3, padTo: 9});
        
        for (let i = 0; i < HISTOGRAM_SIZE; ++i) {
            const e = document.getElementById(`histogram${i}`);
            e.setAttribute("width", statistics.histogram.get(i) * 200 / statistics.histogramMaxValue || 0);
            e.setAttribute("fill", "#" + formatInt(
                this.screen.getColorRgb(statistics.minDepth + (statistics.histogramBucketSize || 0) * i, time),
                {base: 16, padTo: 6, padChar: '0'}
            ));
        }
        document.getElementById("min-depth").textContent = format(statistics.minDepth);
        document.getElementById("max-depth").textContent = format(statistics.maxDepth);
        document.getElementById("max-n").textContent = format(this.core.max_n);
        
        const percentage = formatFloat((statistics.histogramCount / statistics.count * 100 || 0), {dec: 2});
        const bucketSize = formatFloat(statistics.histogramBucketSize || 0, {dec: 1});
        const maxValue = formatInt(statistics.histogramMaxValue, {});
        document.getElementById("histogram-info").textContent = `${percentage}% - ${bucketSize} - ${maxValue}`;
        
        this.paintTime += performance.now() - startTime;
        this.paintCount++;
    }

    clear() {
        this.screen.clear();
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
    
    onMouseRect(start, end) {
        const {x, y, dx, dy} = asRectWithAspectRatio(start, end, X_SIZE / Y_SIZE);
        console.info("rect", start, end);
        this.core.onSelectedZoom(x, y, dx, dy);
    }
    
    onMouseEvent() {
        this.onEvent();
    }
    
    onFinished() {
        const statistics = this.screen.getStatistics();

        console.info("percentage", statistics.histogramCount / statistics.count * 100);
        console.info(statistics.histogramCount, statistics.count, statistics.infiniteCount);

        console.info("screen paint average", this.paintTime / this.paintCount, "ms");
        this.paintCount = 0;
        this.paintTime = 0;
        
        this.onEvent();
    }
}