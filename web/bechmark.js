
export default class Bechmark {
    constructor() {

    }

    // Save benchmark.
    saveBenchmark() {
        const data = this.historyData[this.currentId];
        console.info("benchmark done", data);
    }
}