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
        this.data = {};
        this.createProperty(BACKEND_KEY, "java");
        this.createProperty("state", STATE_WAITING_STARTUP, false);
        this.createProperty("workers", "max");
        this.createProperty("workers_value", MAX_WORKERS, false);
        this.createProperty("max_workers", 1, false);
        this.createProperty("coordinates", {
            x0_start_index: Math.round(-0.5 * X_SIZE),
            y0_start_index: Math.round(-0.5 * Y_SIZE),
            x0_delta: 4 / X_SIZE,
            y0_delta: 4 / Y_SIZE,
        }, false);
        this.createProperty("max_n", 32 * 1024);
        this.createProperty("colors", "C64");
        this.createProperty("color_cycle", 0);
        this.createProperty("color_scale", 256);
        this.createProperty("color_offset", "OFF");
        this.createProperty("speed_top_list", [], false);
        this.createProperty("worker_speed_top_list", [], false);
    }

    createProperty(key, defaultValue, persistent=true) {
        if (persistent) {
            Object.defineProperty(this, key, {
                get: () => this.getPersistent(key, defaultValue),
                set: value => this.putPersistent(key, value),
            });
        }
        else {
            Object.defineProperty(this, key, {
                get: () => this.getVolatile(key, defaultValue),
                set: value => this.putVolatile(key, value),
            });
        }
    }

    subscribe(key, onChange) {
        const id = this.subscriberId++;
        this.subscribers[key] = this.subscribers[key] || {}
        this.subscribers[key][id] = onChange;
        return () => delete this.subscribers[key][id];
    }

    getPersistent(key, defaultValue) {
        const value = localStorage.getItem(key);
        if (value === null) {
            if (defaultValue !== undefined) {
                this.putPersistent(key, defaultValue);
                return defaultValue;
            }
            return null;
        }
        return JSON.parse(value);
    }

    putPersistent(key, value) {
        const before = JSON.parse(localStorage.getItem(key));
        localStorage.setItem(key, JSON.stringify(value));
        Object.values(this.subscribers[key] || {}).forEach(onChange => onChange(before, value));
    }

    getVolatile(key, defaultValue) {
        const value = this.data[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                this.putVolatile(key, defaultValue);
                return defaultValue;
            }
        }
        return value;
    }

    putVolatile(key, value) {
        const before = this.data[key];
        this.data[key] = value;
        Object.values(this.subscribers[key] || {}).forEach(onChange => onChange(before, value));
    }

    getBackendAliveKey(backend) {
        return "backendAlive-" + backend;
    }

    getBackendAlive(backend) {
        return this.getVolatile("backendAlive-" + backend, false);
    }

    putBackendAlive(backend, value) {
        this.putVolatile("backendAlive-" + backend, value);
    }

    getWorkerCount() {
        return Math.min(this.max_workers, this.workers_value);
    }

}