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
        this.scale = true;
        this.cycleTime = 4000;
        this.gradients = [];
        this.gradientsSize = 0;
    }
    
    setScreenColors(minDepth, maxDepth, histogram, histogramBucketSize) {
        this.screen.removeGradients();
        let multiple = 1.0;
        if (this.scale) {
            multiple = Math.max(1, maxDepth - minDepth) / this.gradientsSize;
        }
        
        this.gradients.forEach(gradient => {
            this.screen.addGradient(gradient.from, Math.max(1, Math.round(gradient.count * multiple)), gradient.to);
        });

        // Calculate cycle time based on stretched gradient.
        const cycleInterval = Math.floor(this.cycleTime / (multiple * this.gradientsSize));
        this.screen.setCycleInterval(cycleInterval);
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