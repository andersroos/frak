
onmessage = event => {
    for (let i = 0; i < 200; ++i) {
        console.info("sending", i);
        postMessage(i);
    }
};

