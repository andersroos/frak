export const CALCULATING =    0xfffffffe;
export const INFINITE =       0xfffffffb;

export default class Colors {
    constructor(screen) {
        this.screen = screen;
        this.scale = false;
        this.gradients = [];
    }
    
    setScreenColors(minDepth, maxDepth, histogram, histogramBucketSize) {
        this.screen.setFlags("wrap");
        this.screen.removeGradients();
        this.screen.addGradient(0x00ff80, 16, 0xffffff);
        this.screen.addGradient(0xffffff, 128, 0xff0000);
        this.screen.addGradient(0xff0000, 128 , 0x00ff80);
    }
    
    parse(str) {
    }
    
    format () {
    }
    
}