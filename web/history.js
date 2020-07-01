
const storeSatedInServer = saved => {
    localStorage.setItem('saved', JSON.stringify(saved));
};

const loadSavedFromServer = () => {
    return new Promise((resolve, reject) => {
        const saved = JSON.parse(localStorage.getItem('saved') || '{}');
        resolve(saved);
    });
};

export default class History {
    
    constructor(onChanged, startFromHistory) {
        this.onChanged = onChanged;
        this.startFromHistory = startFromHistory;
        this.currentId = null;
        this.historyData = {};
        this.savedData = {};
        
        loadSavedFromServer().then(saved => {
            Object.entries(saved).forEach(([key, e]) => {
                this.savedData[key] = e;
            });
            this.onChanged();
        });
        
        window.onpopstate = (e) => {
            if (e.state && e.state.id) {
                const data = this.historyData[e.state.id];
                if (data) {
                    this.currentId = e.state.id;
                    this.startFromHistory(data);
                    this.onChanged();
                }
            }
        };
    }

    // Save benchmark.
    saveBenchmark() {
        const data = this.historyData[this.currentId];
        console.info("benchmark done", data);
    }
    
    // Return a list of saved.
    listSaved() {
        const result = Object.values(this.savedData);
        result.sort((a, b) => b.id - a.id);
        return result;
    }
    
    // Return saved data.
    getSaved(key) {
        return this.savedData[key];
    }
    
    // Called when new fractal is started (for example on zoom).
    push(data) {
        this.historyData[data.id] = data;
        this.currentId = data.id;
        window.history.pushState({id: data.id}, null, "#" + data.id);
        this.onChanged();
    }
    
    // Update current fractal with historyData (elapsed time, colors, etc).
    update(data) {
        if (data.id === this.currentId) {
            Object.assign(this.historyData[data.id], data);
            this.onChanged();
        }
    }
    
    // Persist current data as a benchmark result.
    addBenchmarkResult() {
        const data = this.historyData[this.currentId];
        if (data.key !== 'benchmark') {
            throw new Error('current data is not a benchmark run');
        }
    }
    
    isKeySaved(key) {
        return Boolean(this.savedData[key]);
    }
    
    // Save current fractal to persistent storage or update if exists, key is key
    save(key) {
        console.info("saving", key);
        this.savedData[key] = Object.assign(this.savedData[key] || {}, this.historyData[this.currentId] || {}, {key: key});
        storeSatedInServer(this.savedData);
        this.onChanged();
    }
    
    // Remove fractal from persistent storage.
    removeSaved(key) {
        delete this.savedData[key];
        storeSatedInServer(this.savedData);
        this.onChanged();
    }
    
}
