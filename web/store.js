import {X_SIZE, Y_SIZE} from "./dimensions";


// Calculation states.
export const CALCULATION_WAITING = "waiting";
export const CALCULATION_WAITING_STARTUP = "waiting-startup";
export const CALCULATION_WAITING_OFFLINE = "waiting-offline";
export const CALCULATION_WAITING_COMPLETED = "waiting-completed";
export const CALCULATION_WAITING_ABORTED = "waiting-aborted";
export const CALCULATION_ABORTING = "aborting";
export const CALCULATION_CALCULATING = "calculating";

// Backend states.
export const BACKEND_ONLINE = "backend-online";
export const BACKEND_CONNECTING = "backend-connecting";
export const BACKEND_OFFLINE = "backend-offline";

export const MAX_WORKERS = 8192;

export default class Store {

    constructor() {
        this.subscriberId = 0;
        this.subscribers = {};
        this.data = {};
        this.createProperty("backend", "java");
        this.createProperty("backend_state", BACKEND_OFFLINE, false);
        this.createProperty("state", CALCULATION_WAITING_STARTUP, false);
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
        this.createProperty("top_list", [], false);
        this.createProperty("top_list_type", "speed");
        this.createProperty("workers_filter", "off");
        this.createProperty("benchmark_filter", "off");

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

    isBackendAlive() {
        return BACKEND_ONLINE === this.backend_state;
    }

    getWorkerCount() {
        return Math.min(this.max_workers, this.workers_value);
    }

}