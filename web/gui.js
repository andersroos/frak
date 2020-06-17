


export default class Gui {
    constructor(core) {
        this.core = core;
        
        this.elapsed = document.getElementById('elapsed');
    }

    paint() {
        const elapsed = this.core.getElapsedTime();
        if (!elapsed) {
            this.elapsed.textContent = '';
        }
        else {
            this.elapsed.textContent = '' + (elapsed / 1000).toFixed(3);
        }
    }
}