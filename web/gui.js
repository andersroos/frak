
const HISTOGRAM_SIZE = 128;

export default class Gui {
    constructor(core, screen) {
        this.core = core;
        this.screen = screen;
        
        this.elapsed = document.getElementById('elapsed');
        
        const svg = document.getElementById('histogram');
        svg.setAttribute("height", HISTOGRAM_SIZE * 3);
        console.info(svg);
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

    paint() {
        const elapsed = this.core.getElapsedTime();
        this.elapsed.textContent = elapsed ? (elapsed / 1000).toFixed(3).toString() : '';
        
        const statistics = this.screen.getStatistics();
        for (let i = 0; i < HISTOGRAM_SIZE; ++i) {
            document.getElementById(`histogram${i}`).setAttribute("width", statistics.histogram.get(i) * 200 / statistics.histogramMaxCount || 0)
        }
        document.getElementById("min-depth").textContent = statistics.minDepth.toString();
        document.getElementById("histogram-max").textContent = statistics.histogramMaxDepth.toString();
        document.getElementById("max-depth").textContent = statistics.maxDepth.toString();
    }
    
    onFinished() {
        const statistics = this.screen.getStatistics();
        console.info(statistics);
    }
}