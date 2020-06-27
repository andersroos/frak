

const loadFromServer = () => {
    return new Promise((resolve, reject) => {
        const saved = JSON.parse(localStorage.getItem('saved') || '{}');
        resolve(saved);
    });
};

export default class History {
    
    constructor(onChanged) {
        this.onChanged = onChanged;
        this.currentId = null;
        this.data = {};
        this.history = [];
        this.savedIds = new Set();
        loadFromServer().then(saved => {
            Object.entries(saved).forEach(([id, e]) => {
                this.data[id] = e;
                this.savedIds.add(id);
            });
            this.onChanged();
        });
    }

    // Return a list of saved including current.
    list() {
        const saved = Array.from(this.savedIds.values(), id => this.data[id]);
        if (!this.savedIds.has(this.currentId) && this.currentId) {
            saved.push(this.data[this.currentId]);
        }
        saved.sort((a, b) => a.id - b.id);
        return saved;
    }
    
    // Called when new fractal is started (for example on zoom).
    push(data) {
        this.data[data.id] = data;
        this.currentId = data.id;
        this.history.push(data.id);
        this.onChanged();
    }
    
    // Removes current and makes last on back stack current. The current will be kept in forward list.
    back() {
    }
    
    // Pushes next on forward list and makes it current if it exists.
    forward() {
    }
    
    // Update current fractal with data (elapsed time, colors, etc).
    update(data) {
        if (data.id === this.currentId) {
            Object.assign(this.data[data.id], data);
            this.onChanged();
        }
    }
    
    // Save current fractal to persistent storage.
    save() {
    }
    
    // Remove current fractal from persistent storage.
    remove() {
    }
    
}