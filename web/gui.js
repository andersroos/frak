import {calculateWeight, formatInt} from "./util";
import {HISTOGRAM_SIZE, X_SIZE, Y_SIZE} from "./dimensions";
import Colors from "./colors";
import {WheelSelectInput, WheelValueInput} from "./inputs";
import {BACKEND_CONNECTING, BACKEND_OFFLINE, BACKEND_ONLINE, MAX_WORKERS} from "./store";
import {
    CALCULATION_CALCULATING,
    CALCULATION_ABORTING,
    CALCULATION_WAITING,
    CALCULATION_WAITING_ABORTED,
    CALCULATION_WAITING_OFFLINE,
    CALCULATION_WAITING_STARTUP,
    CALCULATION_WAITING_COMPLETED
} from "./store";

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


export default class Gui {
    
    constructor(core, store, screen, backendList) {
        this.screen = screen;
        this.colors = new Colors(this.screen);
        this.core = core;
        this.store = store;

        // Init canvas and screen.

        this.context = document.getElementById("canvas").getContext("2d");
        this.context.canvas.width = X_SIZE;
        this.context.canvas.height = Y_SIZE;

        this.imageBytesRef = this.screen.refImageBytes();
        const uint8ClampedArray = new Uint8ClampedArray(this.imageBytesRef.buffer, this.imageBytesRef.byteOffset, this.imageBytesRef.byteLength);
        this.imageData = new ImageData(uint8ClampedArray, X_SIZE, Y_SIZE);

        this.paintTime = 0;
        this.paintCount = 0;

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
        this.maxNInput = new WheelValueInput({
            store: this.store,
            id: 'max_n',
            onChangeByUser: v => {
                this.core.startFromNewMaxN();
            },
            newValue: (v, direction) => direction ? Math.max(1, v / QBRT_2) : Math.min(v * QBRT_2, 1024 * 1024 * 1024),
            formatValue: v => formatInt(v, {padTo: 12, space: 3}),
        });

        // Backend.
        const backendColor = {
            [BACKEND_OFFLINE]: "#f00",
            [BACKEND_CONNECTING]: "#f80",
            [BACKEND_ONLINE]: "#0f0",
        };
        const onBackendChange = () => document.getElementById("backend").style.color = backendColor[this.store.backend_state];
        this.backendInput = new WheelSelectInput({
            id: "backend",
            store: this.store,
            options: backendList.map(backend => ({key: backend, value: backend})),
            formatKey: v => v.padStart(13, " "),
            onChange: onBackendChange,
        });
        this.store.subscribe("backend_state", onBackendChange);

        // Worker count.
        this.workerCountInput = new WheelSelectInput({
            store: this.store,
            id: 'workers',
            options: [
                {key: '1', value: 1},
                {key: '4', value: 4},
                {key: '8', value: 8},
                {key: '24', value: 24},
                {key: 'max', value: MAX_WORKERS},
            ],
            onChange: (key, value) => {
                this.store.workers_value = value;
            },
            formatKey: v => {
                if (v === 'max') {
                    v = `max (${this.store.max_workers})`;
                }
                return v.padStart(13, " ");
            }
        });
        this.store.subscribe("max_workers", () => this.workerCountInput.format())

        // Colors.
        this.colorsInput = new WheelSelectInput({
            store: this.store,
            id: 'colors',
            options: [
                {
                    key: 'RAINBOW',
                    value: "9400d3-#32-4b0082-#32-0000ff-#32-00ff00-#32-ffff00-#32-ff7f00-#32-ff0000-#32-9400d3"
                },
                {key: 'WHITE*RED', value: "101010-#64-ffffff-#64-ff0000-#24-101010"},
                {key: 'C64', value: "eef493-#1-a8654a-#1-7ccb8e-#1-000000-#1-eef493"},
            ],
            onChange: (key, value) => {
                this.colors.parse(value);
                this.onEvent();
            },
        });

        // Color cycle.
        this.colorCycleInput = new WheelSelectInput({
            store: this.store,
            id: 'color_cycle',
            onChange: (key, value) => {
                this.colors.setCycleTime(value * 1000);
                this.onEvent();
            },
            options: [
                {value: 0, key: 'OFF'},
                {value: 10, key: '10 S'},
                {value: 6, key: '6 S'},
                {value: 4, key: '4 S'},
                {value: 2, key: '2 S'},
                {value: 1, key: '1 S'},
            ],
        });

        // Color scale.
        this.colorScaleInput = new WheelValueInput({
            store: this.store,
            id: 'color_scale',
            newValue: (v, direction) => direction ? Math.max(4, v / QBRT_2) : v * QBRT_2,
            onChange: v => {
                this.colors.setScaleLength(v);
                this.onEvent();
            },
            formatValue: v => {
                return formatInt(v, {space: 3});
            },
        });

        // Color offset.
        this.colorOffsetImput = new WheelSelectInput({
            store: this.store,
            id: 'color_offset',
            onChange: (key, value) => {
                this.colors.setColorOffset(value);
                this.onEvent();
            },
            options: [
                {value: 0,    key: 'OFF'},
                {value: 0.1,  key: '10%'},
                {value: 0.2,  key: '20%'},
                {value: 0.3,  key: '30%'},
                {value: 0.4,  key: '40%'},
                {value: 0.5,  key: '50%'},
                {value: 0.6,  key: '60%'},
                {value: 0.7,  key: '70%'},
                {value: 0.8,  key: '80%'},
                {value: 0.9,  key: '90%'},
                {value: 1,    key: 'MIN*DEPTH'},
            ]
        });

        // State
        const stateColors = {
            [CALCULATION_CALCULATING]: "#0f0",
            [CALCULATION_ABORTING]: "#f80",
            [CALCULATION_WAITING]: "#0f0",
            [CALCULATION_WAITING_ABORTED]: "#f80",
            [CALCULATION_WAITING_OFFLINE]: "#f00",
            [CALCULATION_WAITING_STARTUP]: "#0f0",
            [CALCULATION_WAITING_COMPLETED]: "#0f0"
        };
        const stateTexts = {
            [CALCULATION_CALCULATING]: "calculating",
            [CALCULATION_ABORTING]: "aborting",
            [CALCULATION_WAITING]: "waiting",
            [CALCULATION_WAITING_ABORTED]: "calculation aborted",
            [CALCULATION_WAITING_OFFLINE]: "backend offline",
            [CALCULATION_WAITING_STARTUP]: "starting up",
            [CALCULATION_WAITING_COMPLETED]: "calculation completed"
        }
        this.store.subscribe("state", (before, after) => {
            const element = document.getElementById("state");
            element.textContent = stateTexts[after];
            element.style.color = stateColors[after];
        });

        // Setup paint loop.
        this.lastEvent = performance.now();
        const paint = () => {
            if (performance.now() < this.lastEvent + 30000) {
                const statistics = this.screen.getStatistics();
                this.colors.setScreenColors(statistics.minDepth);
                this.paint(statistics);
                statistics.histogram.delete();
            }
            requestAnimationFrame(paint);
        };
        setTimeout(paint, 0);

        // Benchmarks
        document.querySelector("#benchmark00").onclick = () => {
            this.core.startBenchmark00();
            return false;
        };
        document.querySelector("#benchmark01").onclick = () => {
            this.core.startBenchmark01();
            return false;
        };
        document.querySelector("#benchmark12").onclick = () => {
            this.core.startBenchmark12();
            return false;
        };
        document.querySelector("#benchmark40").onclick = () => {
            this.core.startBenchmark40();
            return false;
        };
        document.onkeyup = e => {
            if (e.altKey && e.ctrlKey) {
                if (e.code === 'Digit1') {
                    this.core.startBenchmark01();
                }
                else if (e.code === 'Digit2') {
                    this.core.startBenchmark12();
                }
                else if (e.code === 'Digit3') {
                    this.core.startBenchmark40();
                }
            }
        };

        // Top lists.
        this.topListInput = new WheelSelectInput({
            store: this.store,
            id: "top_list_type",
            formatKey: k => k.padStart(16, " "),
            onChange: () => this.onEvent(),
            options: ["speed", "worker*speed"].map(v => ({value: v, key: v})),
        });
        this.workersFilerInput = new WheelSelectInput({
            store: this.store,
            id: "workers_filter",
            formatKey: k => k.padStart(3, " "),
            onChange: () => this.onEvent(),
            options: ["off", "24", "8", "4", "1"].map(v => ({value: v, key: v})),
        });
        this.benchmarkFilerInput = new WheelSelectInput({
            store: this.store,
            id: "benchmark_filter",
            formatKey: k => k.padStart(3, " "),
            onChange: () => this.onEvent(),
            options: ["off", "40", "12", "01"].map(v => ({value: v, key: v})),
        });
        this.store.subscribe("top_list", (before, after) => {
            const type = this.store.top_list_type;
            const template = document.querySelector(`#${type.replace("*", "-")}-row`);
            const tbody = document.querySelector("#top-list tbody");
            tbody.innerHTML = null;
            after.forEach(item => {
                const row = template.content.cloneNode(true);
                row.querySelector(".backend").textContent = item.backend;
                row.querySelector(".hardware").textContent = item.hardware;
                row.querySelector(".speed").textContent = formatFloat(item.speed, {dec: 2});
                if (type === "speed") {
                    row.querySelector(".workers").textContent = item.workers;
                }
                row.querySelector(".count").textContent = formatInt(item.count, {padTo: 4, space: 3});
                tbody.appendChild(row);
            });
        });
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
        
        document.getElementById("weight").textContent = formatFloat(calculateWeight(statistics, this.store.max_n), {human: true, dec: 4, padTo: 9});
        
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
        this.core.startFromZoom(x, y, dx, dy);
    }
    
    onMouseEvent() {
        this.onEvent();
    }
    
    onFinished(statistics) {
        console.info("screen paint average", this.paintTime / this.paintCount, "ms");
        this.paintCount = 0;
        this.paintTime = 0;
        
        this.onEvent();
    }
}
