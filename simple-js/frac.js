
function draw() {
    const canvas = document.getElementById("frac");
    const context = canvas.getContext("2d");
    context.fillStyle = "rgb(0,0,0)";
    context.fillRect(0, 0, 200, 200);

    const max_iteration = 32;
    
    const xd = 4/100;
    const yd = 4/100;
    
    for (let yc = 0, y0 = -2; yc < 100; ++yc, y0 += yd) {
        for (let xc = 0, x0 = -2; xc < 100; ++xc, x0 += xd) {
            let iteration = 0;
            let x = 0;
            let y = 0;
            while ((x*x + y*y <= 4) && (iteration < max_iteration)) {
                var xtemp = (x*x) - (y*y) + x0;
                y = (2*x*y) + y0;
                x = xtemp;
                iteration++;
            }
            var val;
            if (iteration >= max_iteration) {
                val = 0;
            } 
            else {
                val = Math.floor(255 - (255 * (iteration / max_iteration)));
            }
            context.fillStyle = "rgb(" + val + "," + val + "," + val + ")";
            context.fillRect(xc * 2, yc * 2, 2, 2);
        }
    }
}
