import {HISTOGRAM_SIZE} from "./dimensions";

export const CALCULATING =    0xfffffffe;
export const INFINITE =       0xfffffffb;

class Gradient {

    constructor(from, to, count) {
        this.from = from;
        this.to = to;
        this.count = count;
    }
}

export default class Colors {
    constructor(screen) {
        this.screen = screen;
        this.scaleRatio = 0;
        this.cycleTime = 0;
        this.gradients = [];
        this.gradientsSize = 0;
    }
    
    // Cycle through colors in cycleTime ms, 0 means don't cycle.
    setCycleTime(cycleTime) {
        this.cycleTime = cycleTime;
    }
    
    // Scale colors so that at most ratio of all pixels are included in gradients, 0 means don't scale gradients.
    setScaleRatio(ratio) {
        this.scaleRatio = ratio;
    }
    
    setScreenColors({minDepth, maxDepth, histogram, histogramBucketSize, histogramCount, count}) {
        this.screen.removeGradients();
        
        let multiple = 1.0;
        if (this.scaleRatio && count > 0) {
            let index = 0;
            let countAtIndex = 0;
            while (true) {
                if (count * this.scaleRatio < countAtIndex) {
                    multiple = histogramBucketSize * index / this.gradientsSize;
                    break;
                }
                
                if (index >= HISTOGRAM_SIZE) {
                    // Histogram does not contain everything, linear extrapolate from end of histogram.
                    if (this.scaleRatio >= 1) {
                        multiple = this.scaleRatio * (maxDepth - minDepth) / this.gradientsSize;
                    }
                    else {
                        const startRatio = histogramCount / count;
                        const depthSpan = maxDepth / (1.0 - startRatio) * (this.scaleRatio - startRatio) - minDepth;
                        multiple = depthSpan / this.gradientsSize;
                    }
                    break;
                }

                countAtIndex += histogram.get(index);
                ++index;
            }
        }

        this.screen.setColorOffset(this.scaleRatio === 0 ? 0 : minDepth);
        
        this.gradients.forEach(gradient => {
            this.screen.addGradient(gradient.from, Math.max(1, Math.round(gradient.count * multiple)), gradient.to);
        });

        // Calculate cycle time based on stretched gradient.
        const number = this.cycleTime / (multiple * this.gradientsSize);
        // console.info("cycle interval", number);
        this.screen.setCycleInterval(number);
    }
    
    parse(str) {
        this.gradients.length = 0;
        
        const tokens = str.split('-');
        
        // validate tokens
        
        const types = tokens.map(token => {
            if (token.match("#\\d+")) return "count";
            if (token.match("[0-9a-fA-F]{6}")) return "color";
            throw new Error(`token "${token}" unknonw token type`);
        });
        
        if (types[0] !== "color" && types[types.length - 1] !== "color") {
            throw new Error("first and last should be color");
        }
        
        let last = null;
        types.forEach(type => {
            if ((last !== "color" && type !== "color") || (last === "color" && type === "color")) throw new Error("every other should be color: " + types.toString());
            last = type;
        });
        
        // parse into gradients
        
        let from = null;
        let to = null;
        let count = null;
        
        tokens.forEach(token => {
            if (token[0] === '#') {
                if (count !== null) {
                    throw new Error("count should be after color");
                }
                count = Number.parseInt(token.slice(1));
                if (count <= 0) {
                    throw new Error("count shoule be at least 1 or this gradient is nothing");
                }
            }
            else {
                const color = Number.parseInt(token, 16);
                if (from === null) {
                    from = color;
                }
                else {
                    to = color;
                }
            }
            
            if (to !== null) {
                this.gradients.push(new Gradient(from, to, count));
                from = to;
                count = null;
                to = null;
            }
        });
        
        this.gradientsSize = this.gradients.reduce((a, g) => a + g.count, 0);
    }
    
    format () {
    }
    
}