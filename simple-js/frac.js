
const size = 800;
const max_n = 32;

function draw() {
    const canvas = document.getElementById("frac");
    const context = canvas.getContext("2d");
    context.fillStyle = "rgb(0,0,0)";
    context.fillRect(0, 0, size, size);

    const xd = 4/size;
    const yd = 4/size;
    
    for (let yc = 0, y0 = -2; yc < size; ++yc, y0 += yd) {
        for (let xc = 0, x0 = -2; xc < size; ++xc, x0 += xd) {
            let iteration = 0;
            let x = x0;
            let y = y0;
            for (; iteration < max_n; ++iteration) {
                let x2 = x * x;
                let y2 = y * y;
                if ((x2 + y2) >= 4) {
                    break;
                }
                const xn = x2 - y2 + x0;
                const yn = 2 * x * y + y0;
                x = xn;
                y = yn;
            }
            var val;
            if (iteration >= max_n) {
                val = 0;
            } 
            else {
                val = Math.floor(255 - (255 * (iteration / max_n)));
            }
            context.fillStyle = "rgb(" + val + "," + val + "," + val + ")";
            context.fillRect(xc, yc, 1, 1);
        }
    }
}
