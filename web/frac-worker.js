
onmessage = event => {
    const {id, x, y, x_size, y_size, x0_start, y0_start, y0_delta, x0_delta, max_n, worker_index} = event.data;
    // console.info("starting block", event.data);
    const data = new Uint32Array(y_size * x_size);
    
    for (let yi = 0, y0 = y0_start; yi < y_size; ++yi, y0 += y0_delta) {
        for (let xi = 0, x0 = x0_start; xi < x_size; ++xi, x0 += x0_delta) {
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
            data[yi * y_size + xi] = n;
        }
    }
    // console.info("block done", event.data);
    
    postMessage({bytes: data.buffer, id, x, y, x_size, y_size, op: "block", src: "worker", worker_index, max_n}, [data.buffer]);
};
