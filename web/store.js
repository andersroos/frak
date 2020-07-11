import {X_SIZE, Y_SIZE} from "./dimensions";

export const STATE_WAITING = "waiting";
export const STATE_WAITING_STARTUP = "waiting-startup";
export const STATE_WAITING_OFFLINE = "waiting-offline";
export const STATE_WAITING_COMPLETED = "waiting-completed";
export const STATE_WAITING_ABORTED = "waiting-aborted";
export const STATE_ABORTING = "aborting";
export const STATE_CALCULATING = "calculating";

export const BACKEND_KEY = "backend";

export const MAX_WORKERS = 8192;

export default class Store {

    constructor() {
        this.subscriberId = 0;
        this.subscribers = {};
        this.createProperty(BACKEND_KEY, "java");
        this.createProperty("state", STATE_WAITING_STARTUP);
        this.createProperty("workers", "max");
        this.createProperty("workers_value", MAX_WORKERS);
        this.createProperty("max_workers", 1);
        this.createProperty("coordinates", {
            x0_start_index: Math.round(-0.5 * X_SIZE),
            y0_start_index: Math.round(-0.5 * Y_SIZE),
            x0_delta: 4 / X_SIZE,
            y0_delta: 4 / Y_SIZE,
        });
        this.createProperty("max_n", 32 * 1024);
        this.createProperty("colors", "C64");
        this.createProperty("color_cycle", 0);
        this.createProperty("color_scale", 256);
        this.createProperty("color_offset", "OFF");
    }

    createProperty(key, defaultValue) {
        Object.defineProperty(this, key, {
            get: () => this.get(key, defaultValue),
            set: value => this.put(key, value),
        });
    }

    subscribe(key, onChange) {
        const id = this.subscriberId++;
        this.subscribers[key] = this.subscribers[key] || {}
        this.subscribers[key][id] = onChange;
        return () => delete this.subscribers[key][id];
    }

    get(key, defaultValue) {
        const value = localStorage.getItem(key);
        if (value === null) {
            if (defaultValue !== undefined) {
                localStorage.setItem(key, JSON.stringify(defaultValue));
                Object.values(this.subscribers[key] || {}).forEach(onChange => onChange(undefined, defaultValue));
                return defaultValue;
            }
            return value;
        }
        return JSON.parse(value);
    }

    put(key, value) {
        const before = JSON.parse(localStorage.getItem(key));
        localStorage.setItem(key, JSON.stringify(value));
        Object.values(this.subscribers[key] || {}).forEach(onChange => onChange(before, value));
    }

    getBackendAliveKey(backend) {
        return "backendAlive-" + backend;
    }

    getBackendAlive(backend) {
        return this.get("backendAlive-" + backend, false);
    }

    putBackendAlive(backend, value) {
        this.put("backendAlive-" + backend, value);
    }

    getWorkerCount() {
        return Math.min(this.max_workers, this.workers_value);
    }

}