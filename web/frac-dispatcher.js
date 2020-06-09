
const workers = Array.from(Array(24), () => new Worker("./frac-worker.js"));
console.info("created workers", workers.length);
let blocks = new Array(0);

const postBlock = (worker, worker_index) => {
    if (blocks.length > 0) {
        const block = blocks.shift();
        block.worker_index = worker_index;
        worker.postMessage(block);
    }
    else {
        console.info("worker", worker_index, "finished");
    }
};

const blockComplete = event => {
    const {bytes, id, x, y, x_size, y_size, max_n, worker_index} = event.data;
    
    postBlock(workers[worker_index], worker_index);
    
    const data = new Uint32Array(bytes);

    // convert colors
    for (let i = 0; i < data.length; ++i) {
        n = data[i];
        if (n === max_n) {
            data[i] = 0x000000ff;
        }
        else {
            const col = (n & 63) << 2;
            data[i] = col << 24 | col << 16 | col << 8 | 0xff;
        }
    }
    postMessage({id, x, y, bytes, x_size, y_size, src: "dispatcher"}, [bytes]);
};

const startFractal = event => {
    const {id, x_size, y_size, max_n} = event.data;
    
    const x0_start = -2;
    const y0_start = -2;
    const x0_delta = 4 / x_size;
    const y0_delta = 4 / y_size;
    
    // create one block per line to start (ok we need common class, so we will need to build this js soon).
    for (let y = 0; y < y_size; ++y) {
        blocks.push({id, x: 0, y, x_size, y_size: 1, x0_start, x0_delta, y0_start: y0_start + y0_delta * y, y0_delta, max_n, src: "dispatcher"});
    }
    console.info(blocks.length, workers.length);
    workers.forEach((w, i) => postBlock(w, i));
};

onmessage = startFractal;
workers.forEach(w => w.onmessage = blockComplete);
