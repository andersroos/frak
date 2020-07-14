
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
            this.calculateTopList();
        });

        const onStoreChange = (before, after) => {if (before !== after) this.calculateTopList()}
        this.store.subscribe("top_list_type", onStoreChange);
        this.store.subscribe("workers_filter", onStoreChange);
        this.store.subscribe("benchmark_filter", onStoreChange);

        this.items = {}
    }

    // Save benchmark.
    saveBenchmark(item) {
        this.items[item.id] = item;
        const params = {TableName: "frak-benchmark", Item: AWS.DynamoDB.Converter.marshall(item)};
        this.db.putItem(params, err => { if (err) console.error("failed to put item to aws", err) });
        this.calculateTopList();
    }

    calculateTopList() {
        const type = this.store.top_list_type;
        const benchmark = this.store.benchmark_filter;
        const workers = Number.parseInt(this.store.workers_filter) || null;

        const groups = {};

        // Chose code based on type.
        const groupKeyCreator = {
            "speed":  item => item.backend + "¤" + item.workers,
            "worker*speed": item => item.backend,
        }[type];
        const itemsAggregate = {
            "speed": items => {
                const speed = items.reduce((a, i) => a + i.speed, 0) / items.length;
                return {
                    backend: items[0].backend,
                    workers: items[0].workers,
                    count : items.length,
                    speed,
                }
            },
            "worker*speed": items => {
                const speed = items.reduce((a, i) => a + i.worker_speed, 0) / items.length;
                return {
                    backend: items[0].backend,
                    count : items.length,
                    speed,
                }
            },
        }[type];
        const itemCompare = (a, b) => b.speed - a.speed;
        const normalizeTopList = items => {
            let maxSpeed = items.reduce((a, i) => Math.max(a, i.speed), 0);
            const factor = 100 / maxSpeed;
            items.forEach(i => i.speed = i.speed * factor);
        };

        // Collect for each item.
        Object.values(this.items).forEach(item => {

            // Apply filters.
            if (benchmark !== "off" && item.benchmark !== benchmark) return;
            if (workers && item.workers !== workers) return;

            // Group by key for top list calculations.
            const key = groupKeyCreator(item);
            let group = groups[key];
            if (group) {
                group.push(item);
            }
            else {
                groups[key] = [item];
            }
        });

        // Aggregate for each group.
        const top_list = Object.values(groups).map(itemsAggregate);
        top_list.sort(itemCompare);
        normalizeTopList(top_list);
        this.store.top_list = top_list;
    }

}
