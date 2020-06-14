
const size = 800;
const max_n = 32;

document.addEventListener("DOMContentLoaded", function() {
    const start = Date.now();
    
    const canvas = document.getElementById("frac");
    const context = canvas.getContext("2d");
    context.fillStyle = "rgb(0,0,0)";
    context.fillRect(0, 0, size, size);

    const xd = 4/size;
    const yd = 4/size;
    
    let imageData = new ImageData(size, 1);
    
    for (let yi = 0, y0 = -2; yi < size; ++yi, y0 += yd) {
        
        for (let xi = 0, x0 = -2; xi < size; ++xi, x0 += xd) {
            let n = 0;
            let xn = x0;
            let yn = y0;
            for (; n < max_n; ++n) {
                let x2 = xn * xn;
                let y2 = yn * yn;
                if ((x2 + y2) >= 4) {
                    break;
                }
                const xn_next = x2 - y2 + x0;
                const yn_next = 2 * xn * yn + y0;
                xn = xn_next;
                yn = yn_next;
            }
            var val;
            if (n >= max_n) {
                val = 0;
            }
            else {
                val = Math.floor(255 - (255 * (n / max_n)));
            }
            
            index = xi * 4;
            imageData.data[index + 0] = val;  // red
            imageData.data[index + 1] = val;  // green
            imageData.data[index + 2] = val;  // blue
            imageData.data[index + 3] = 0xff; // alpha
        }
        context.putImageData(imageData, 0, yi);
    }
    
    console.info("finished in", Date.now() - start, "ms");
});
