
onmessage = event => {
    console.info("starting fractal calculation ", event.data);
    
    const {size, max_n} = event.data;

    const xd = 4/size;
    const yd = 4/size;
    
    for (let y = 0, y0 = -2; y < size; ++y, y0 += yd) {
        for (let x = 0, x0 = -2; x < size; ++x, x0 += xd) {
            let n = 0;
            let xn = x0;
            let yn = y0;
            for (; n < max_n; ++n) {
                let xn2 = xn * xn;
                let yn2 = yn * yn;
                if ((xn2 + yn2) >= 4) {
                    break;
                }
                const next_xn = xn2 - yn2 + x0;
                const next_yn = 2 * xn * yn + y0;
                xn = next_xn;
                yn = next_yn;
            }
            postMessage({x, y, n});
        }
    }
};
