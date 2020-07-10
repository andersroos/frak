
export default class History {
    
    constructor(onPopHistory) {
        this.onPopHistory = onPopHistory;
        this.currentHistoryId = null;
        this.historyData = {};

        window.onpopstate = (e) => {
            if (e.state && e.state.historyId) {
                const data = this.historyData[e.state.historyId];
                if (data) {
                    this.historyId = e.state.historyId;
                    this.onPopHistory(data);
                }
            }
        };
    }

    // Push fractal data to be used when popped from back stack.
    push(data) {
        this.currentHistoryId = data.historyId = Date.now();
        this.historyData[this.currentHistoryId] = data;
        window.history.pushState({historyId: this.currentHistoryId}, null, "#" + this.currentHistoryId);
    }

    // Update history, some operations (change of max_n), does not push history but updates the current.
    update(data) {
        Object.assign(this.historyData[this.currentHistoryId], data);
    }
}
