export const BACKEND_KEY = "backend";

export default class Store {

    constructor() {
        this.subscriberId = 0;
        this.subscribers = {}
        this.createProperty(BACKEND_KEY, "java");
    }

    createProperty(key, defaultValue) {
        Object.defineProperty(this, key, {
            get: () => this.get(key, defaultValue),
            set: value => this.put(key, value),
        });
    }

    subscribe(onChange) {
        const id = this.subscriberId++;
        this.subscribers[id] = onChange;
        return () => delete this.subscribers[id];
    }

    get(key, defaultValue) {
        const value = localStorage.getItem(key);
        if (value === undefined && defaultValue !== undefined) {
            localStorage.put(key, JSON.stringify(defaultValue));
            Object.values(this.subscribers).forEach(onChange => onChange(key, undefined, defaultValue));
            return defaultValue;
        }
        return JSON.parse(value);
    }

    put(key, value) {
        const before = JSON.parse(localStorage.getItem(key));
        localStorage.setItem(key, JSON.stringify(value));
        Object.values(this.subscribers).forEach(onChange => onChange(key, before, value));
    }

    getBackendAlive(backend) {
        return this.get("backendAlive-" + backend, false);
    }

    putBackendAlive(backend, value) {
        this.put("backendAlive-" + backend, value);
    }

}