import {formatInt} from "./util";

const HISTOGRAM_SIZE = 128;

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
    }

    paint(statistics) {
        const elapsed = this.core.getElapsedTime();
    
        this.elapsed.textContent = formatFloat(elapsed ? (elapsed / 1000) : 0, {padTo: 7, dec: 2});
        document.getElementById("weight").textContent = formatFloat(statistics.infiniteCount * this.core.max_n + statistics.sumDepth, {human: true, dec: 4, padTo: 9});
        
        const format = number => formatInt(number, {space: 3, padTo: 9});
        
        for (let i = 0; i < HISTOGRAM_SIZE; ++i) {
            const e = document.getElementById(`histogram${i}`);
            e.setAttribute("width", statistics.histogram.get(i) * 200 / statistics.histogramMaxValue || 0);
            e.setAttribute("fill", "#" + formatInt(this.screen.screen.getColorRgb(statistics.minDepth + (statistics.histogramBucketSize || 0) * i), {base: 16, padTo: 6, padChar: '0'}));
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