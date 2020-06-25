import {formatInt} from "./util";
import {HISTOGRAM_SIZE} from "./dimensions";

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
    
    constructor(core, screen) {
        this.core = core;
        this.screen = screen;
        
        this.elapsed = document.getElementById('elapsed');
        
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

        this.colorSelect = new WheelSelectLocalStorage(
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
                this.core.colors.setCycleTime(v * 1000);
                this.core.onEvent();
            }
        );

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
                this.core.colors.setScaleRatio(v);
                this.core.onEvent();
            }
        );
}

    paint(statistics) {
        const elapsed = this.core.getElapsedTime();
        const time = Math.floor(performance.now());
    
        this.elapsed.textContent = formatFloat(elapsed ? (elapsed / 1000) : 0, {padTo: 7, dec: 2});
        document.getElementById("weight").textContent = formatFloat(statistics.infiniteCount * this.core.max_n + statistics.sumDepth, {human: true, dec: 4, padTo: 9});
        
        const format = number => formatInt(number, {space: 3, padTo: 9});
        
        for (let i = 0; i < HISTOGRAM_SIZE; ++i) {
            const e = document.getElementById(`histogram${i}`);
            e.setAttribute("width", statistics.histogram.get(i) * 200 / statistics.histogramMaxValue || 0);
            e.setAttribute("fill", "#" + formatInt(
                this.screen.screen.getColorRgb(statistics.minDepth + (statistics.histogramBucketSize || 0) * i, time),
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
    }
    
    onFinished() {
        const statistics = this.screen.getStatistics();
        console.info(statistics);
        console.info("percentage", statistics.histogramCount / statistics.count * 100);
        console.info(statistics.histogramCount, statistics.count, statistics.infiniteCount);
    }
}