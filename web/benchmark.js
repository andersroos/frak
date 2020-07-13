
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
            console.info(this.items);
        });

        this.items = {}
    }

    // Save benchmark.
    saveBenchmark(item) {
        this.items[item.id] = item;
        const params = {TableName: "frak-benchmark", Item: AWS.DynamoDB.Converter.marshall(item)};
        this.db.putItem(params, err => { if (err) console.error("failed to put item to aws", err) });
    }
}
