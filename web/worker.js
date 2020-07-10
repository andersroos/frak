//
// Entry for fractal worker web worker.
//

import {INFINITE} from "./colors";
import {BLOCK_COMPLETED} from "./op";

onmessage = event => {
    const {id, x_start, y_start, x_size, y_size, x0_start_index, y0_start_index, y0_delta, x0_delta, max_n, worker_index} = event.data;

    const data = new Uint32Array(y_size * x_size);
    
    for (let yi = 0; yi < y_size; ++yi) {
        for (let xi = 0; xi < x_size; ++xi) {
            let y0 = y0_delta * (y0_start_index + yi);
            let x0 = x0_delta * (x0_start_index + xi);
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
            data[yi * x_size + xi] = n >= max_n ? INFINITE : n;
        }
    }

    postMessage({op: BLOCK_COMPLETED, bytes: data.buffer, id, x_start, y_start, x_size, y_size, worker_index, max_n}, [data.buffer]);
};


