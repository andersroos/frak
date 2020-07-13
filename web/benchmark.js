
import AWS from "aws-sdk";


export default class Benchmark {

    constructor(store) {
        this.store = store;

        const credentials = new AWS.Credentials({accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET});
        this.db = new AWS.DynamoDB({region: "eu-north-1", credentials});

        this.db.scan({TableName: "frak-benchmark"}, (err, data) => {
            if (err) {
                console.warn("failed to get benchmark data", err);
                return;
            }

            data.Items.forEach(d => {
                const item = AWS.DynamoDB.Converter.unmarshall(d);
                this.items[item.id] = item;
            })
            this.calculateTopLists();
        });

        this.items = {}
    }

    // Save benchmark.
    saveBenchmark(item) {
        this.items[item.id] = item;
        const params = {TableName: "frak-benchmark", Item: AWS.DynamoDB.Converter.marshall(item)};
        this.db.putItem(params, err => { if (err) console.error("failed to put item to aws", err) });
        this.calculateTopLists();
    }

    calculateTopLists() {
        // TODO Filters.
        const benchmark = null;
        const workers = null;

        const backends = {};
        Object.values(this.items).forEach(item => {
            // Apply filters.
            if (benchmark && item.benchmark !== benchmark) return;
            if (workers && item.workers !== workers) return;

            // Group by backend for toplist calculations.
            let speeds = backends[item.backend];
            if (!speeds) {
                speeds = backends[item.backend] = {worker_speed: [], speed: []};
            }
            // TODO Probably want to separate runs with different number of workers when comparing speeds or average
            // will be dependent on number of runs with different worker counts.
            speeds.worker_speed.push(item.worker_speed);
            speeds.speed.push(item.speed);
        });
        Object.values(backends).forEach(speeds => {
            const length = speeds.worker_speed.length;
            speeds.worker_speed = speeds.worker_speed.reduce((a, b) => a + b) / length;
            speeds.speed = speeds.speed.reduce((a, b) => a + b) / length;
        });

        const speed_top_list = Object.entries(backends).map(([backend, speeds]) => ({backend, speed: speeds.speed}));
        speed_top_list.sort((a, b) => b.speed - a.speed);
        this.store.speed_top_list = speed_top_list;

        const worker_speed_top_list = Object.entries(backends).map(([backend, speeds]) => ({backend, speed: speeds.worker_speed}));
        worker_speed_top_list.sort((a, b) => b.speed - a.speed);
        this.store.worker_speed_top_list = worker_speed_top_list;
    }

}
