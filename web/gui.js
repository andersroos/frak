import { hej } from './common/col.js';

const size = 800;
const x_size = size;
const y_size = size;
const max_n = 1024 * 1024 * 24;
const id = "sune";

function init() {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    context.fillStyle = "rgb(64,64,64)";
    context.fillRect(0, 0, x_size, y_size);

    hej();
    
    const worker = new Worker("./frac-dispatcher.js");

    worker.onmessage = event => {
        const {id, x, y, x_size, y_size, bytes} = event.data;
        context.putImageData(new ImageData(new Uint8ClampedArray(bytes), x_size, y_size), x, y);
    };

    worker.postMessage({id, x_size, y_size, max_n, op: "fractal", src: "gui"});
}

document.addEventListener("DOMContentLoaded", function() {
    init();
});
