

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
        this.savedIds = new Set();
        loadFromServer().then(saved => {
            Object.entries(saved).forEach(([id, e]) => {
                this.data[id] = e;
                this.savedIds.add(id);
            });
            this.onChanged();
        });
        
        window.onpopstate = (e) => {
            if (e.state && e.state.id) {
                // TODO Start fractal from id.
                console.info("starting fractal from", e.state.id);
            }
        };
    }

    // Return a list of saved including current and last history.
    list() {
        const result = Array.from(this.savedIds.values(), id => this.data[id]);
        if (!this.savedIds.has(this.currentId)) {
            result.push(this.data[this.currentId]);
        }
        result.sort((a, b) => b.id - a.id);
        return result;
    }
    
    // Called when new fractal is started (for example on zoom).
    push(data) {
        this.data[data.id] = data;
        this.currentId = data.id;
        window.history.pushState({id: data.id}, null, "#" + data.id);
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