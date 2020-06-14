document.addEventListener("DOMContentLoaded", function() {

    const worker = new Worker("worker.js");
    
    // Does it block?
    
    worker.postMessage(null);
    
    worker.onmessage = event => {
        console.info("got ", event.data);
    };
});