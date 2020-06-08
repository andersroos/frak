var xc = 0;
var yc = 0;

function drawPixel() {
    for (let yc = 0; yc < 100; ++yc) {
        for (let xc = 0; xc < 100; ++xc) {
    
            var canvas = document.getElementById("frac");
            var context = canvas.getContext("2d");
            var x0 = (-50 + xc)/25;
            var y0 = (-50 + yc)/25;
            var x = 0;
            var y = 0;
            var iteration = 0;
            var max_iteration = 32;
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
