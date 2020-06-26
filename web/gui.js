import {formatInt} from "./util";
import {HISTOGRAM_SIZE, X_SIZE, Y_SIZE} from "./dimensions";
import Colors from "./colors";

const SQRT_2 = Math.sqrt(2);
const QBRT_2 = Math.pow(2, 1/3);

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

class ValueWheelLocalStorage {
    constructor({key, onChange, newValue, formatValue, defaultValue}) {
        this.key = key;
        this.value = Number.parseFloat(localStorage.getItem(key)|| defaultValue);
        this.onChange = onChange;
        this.newValue = newValue;
        this.formatValue = formatValue;

        const element = document.getElementById(key);
        element.onwheel = this.onWheel.bind(this);
        
        this.element = element.getElementsByClassName("value")[0];
        
        this.onValueChanged();
    }
    
    set(value) {
        this.value = value;
        this.onValueChanged();
    }
    
    onWheel(event) {
        this.value = this.newValue(this.value, event.deltaY > 0);
        this.onValueChanged()
    }
    
    onValueChanged() {
        this.element.textContent = this.formatValue(this.value);
        localStorage.setItem(this.key, this.value.toString());
        this.onChange(this.value);
    }
}

class OptionWheelLocalStorage {
    
    constructor({key, options, onSelect}) {
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
    
    constructor(core, screen) {
        this.screen = screen;
        this.colors = new Colors(this.screen);
        this.core = core;

        // Init canvas and screen.
        
        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = X_SIZE;
        this.context.canvas.height = Y_SIZE;
        
        this.imageBytesRef = this.screen.refImageBytes();
        const uint8ClampedArray = new Uint8ClampedArray(this.imageBytesRef.buffer, this.imageBytesRef.byteOffset, this.imageBytesRef.byteLength);
        this.imageData = new ImageData(uint8ClampedArray, X_SIZE, Y_SIZE);

        this.paintTime = 0;
        this.paintCount = 0;
        
        // TODO Rename.
        this.mouseState = new MouseState(this.context.canvas, () => this.onMouseEvent(), (start, end) => this.onMouseRect(start, end));
        
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
        
        // Max n.
        
        this.maxNInput = new ValueWheelLocalStorage({
            key: 'max-n',
            onChange: v => {
                this.core.setMaxN(Math.round(v));
                this.core.start();
            },
            newValue: (v, direction) => direction ? Math.max(1, v / QBRT_2) : v * QBRT_2,
            formatValue: v => formatInt(v, {padTo: 12, space: 3}),
            defaultValue: 256 * 1024,
        });
        
        // Color cycle.
        
        this.colorCycleInput = new OptionWheelLocalStorage({
            key: 'color-cycle',
            options: [
                {value: 0,  label: 'OFF'},
                {value: 10, label: '10 S'},
                {value: 6,  label: '6 S'},
                {value: 4,  label: '4 S'},
                {value: 2,  label: '2 S'},
                {value: 1,  label: '1 S'},
            ],
            onSelect: v => {
                this.colors.setCycleTime(v * 1000);
                this.onEvent();
            }
        });
        
        // Color scaling.
        
        this.colorScalingInput = new ValueWheelLocalStorage({
            key: 'color-scaling',
            onChange: v => {
                this.colors.setScaleMultiple(v);
                this.onEvent();
            },
            newValue: (v, direction) => direction ? v / QBRT_2 : v * QBRT_2,
            formatValue: v => {
                if (v === 1) {
                    return "OFF";
                }
                if (v < 1) {
                    const inv = 1/v;
                    if (inv < 4) {
                        return "1/" + formatFloat(inv, {dec: 1});
                    }
                    return "1/" + formatInt(inv, {});
                }
                if (v < 4) {
                    return formatFloat(v, {dec: 1});
                }
                return formatInt(v, {});
            },
            defaultValue: 1
        });

        // Color offset.
        
        this.colorOffsetImput = new OptionWheelLocalStorage({
            key: 'color-offset',
            onSelect: v => {
                this.colors.setColorOffset(v);
                this.onEvent();
            },
            options: [
                {value: 0,    label: 'OFF'},
                {value: 0.1,  label: '10%'},
                {value: 0.2,  label: '20%'},
                {value: 0.3,  label: '30%'},
                {value: 0.4,  label: '40%'},
                {value: 0.5,  label: '50%'},
                {value: 0.6,  label: '60%'},
                {value: 0.7,  label: '70%'},
                {value: 0.8,  label: '80%'},
                {value: 0.9,  label: '90%'},
                {value: 1,    label: 'MIN_DEPTH'},
            ]
        });
        
        // Setup paint loop.
        
        this.lastEvent = performance.now();
        const paint = () => {
            if (performance.now() < this.lastEvent + 30000) {
                const statistics = this.screen.getStatistics();
                this.colors.setScreenColors(statistics.minDepth);
                this.paint(statistics);
            }
            requestAnimationFrame(paint);
        };
        setTimeout(paint, 0);
        
    }

    onEvent() {
        this.lastEvent = performance.now();
    }
    
    paintCanvas(time) {
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
    }

    paintStatistics(time, statistics) {
        const elapsed = this.core.getElapsedTime();
        document.getElementById('elapsed').textContent = formatFloat(elapsed ? (elapsed / 1000) : 0, {padTo: 7, dec: 2});
        
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
        
        const percentage = formatFloat((statistics.histogramCount / statistics.count * 100 || 0), {dec: 2});
        const bucketSize = formatFloat(statistics.histogramBucketSize || 0, {dec: 1});
        const maxValue = formatInt(statistics.histogramMaxValue, {});
        document.getElementById("histogram-info").textContent = `${percentage}% - ${bucketSize} - ${maxValue}`;
    }
    
    paint(statistics) {
        const startTime = performance.now();
        const time = Math.floor(startTime);
        
        this.paintCanvas(time);
        this.paintStatistics(time, statistics);
        
        this.paintTime += performance.now() - startTime;
        this.paintCount++;
    }

    onMouseRect(start, end) {
        const {x, y, dx, dy} = asRectWithAspectRatio(start, end, X_SIZE / Y_SIZE);
        console.info("rect", start, end);
        this.core.zoom(x, y, dx, dy);
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