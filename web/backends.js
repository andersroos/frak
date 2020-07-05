import {BACKEND_KEY} from "./store";


class LocalBackend {
    constructor(store, key) {
        this.store = store;
        this.key = key;
        this.store.putBackendAlive(this.key, true);
    }

    alive() {
        return true;
    }
}


class RemoteBackend {
    constructor(store, key, url) {
        this.store = store;
        this.key = key;
        this.url = url;
        this.connect();
        this.max_workers = 1;
    }

    connect() {
        if (this.connection) {
            this.connection.close();
        }
        this.connection = new WebSocket(this.url);
        this.connection.binaryType = "arraybuffer";
        this.connection.onmessage = this.onMessage.bind(this);
        this.connection.onclose = this.onClose.bind(this);
        this.connection.onopen = this.onOpen.bind(this);
    }

    alive() {
        return this.store.getBackendAlive(this.key);
    }

    onOpen(e) {
        console.info(this.key, "open", e);
        this.store.putBackendAlive(this.key, true);
    }

    onMessage(e) {
        console.info(this.key, "message", e);
        if (e.data instanceof String) {
            const data = JSON.parse(e.data);
            switch (data.op) {
                case "config": this.max_workers = data.max_workers; break;
                default: throw new Error($`unknown op ${data.op} from ${this.key}`);
            }
        }
        else {
        }
    }

    onClose(e) {
        this.store.putBackendAlive(this.key, false);
        console.info(this.key, "close", e);
    }
}

export class Backends {

    constructor(store) {
        this.store = store;
        this.store.subscribe(this.onChange.bind(this))

        this.backends = Object.fromEntries([
            new RemoteBackend(store, "java", "ws://frak.ygram.se:44001/"),
            new LocalBackend(store, "browser*js"),
        ].map(backend => [backend.key, backend]));

        this.calculatingBackend = null;
        this.selectedBackend = this.backends[this.store.backend];

        setInterval(() => this.reviveBackend(), 1000);
    }

    listBackends() {
        return Object.keys(this.backends).sort();
    }

    reviveBackend() {
        if (this.selectedBackend && !this.selectedBackend.alive()) {
            this.selectedBackend.connect();
        }
    }

    onChange(key, before, after) {
        if (key === BACKEND_KEY && before !== after) {
            this.selectedBackend = this.backends[after];
        }
    }
}