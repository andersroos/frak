
const size = 768;
const max_n = 32;

function init() {
    const canvas = document.getElementById("canvas");
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    const context = canvas.getContext("2d");
    context.fillStyle = "rgb(16,16,16)";
    context.fillRect(0, 0, size, size);

    worker = new Worker("./frac-worker.js");

    worker.onmessage = event => {
        const {x, y, n} = event.data;
        if (n >= max_n) {
            val = 0;
        } 
        else {
            val = Math.floor(255 - (255 * (n / max_n)));
        }
        context.fillStyle = "rgb(" + val + "," + val + "," + val + ")";
        context.fillRect(x, y, 1, 1);
    };

    worker.postMessage({size, max_n});
}

document.addEventListener("DOMContentLoaded", function() {
    init();
});
