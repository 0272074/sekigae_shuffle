class Store {
    constructor() {
        this.state = this.load() || {
            students: [],
            layout: { rows: 6, cols: 6, seats: [] },
            constraints: [],
            history: [],
            currentSeating: null,
            badges: ['A', 'B', 'C']  // Default badge types
        };
        this.listeners = [];
        if (this.state.layout.seats.length === 0) {
            this.initLayout(6, 6);
        }
        // Ensure badges array exists
        if (!this.state.badges) {
            this.state.badges = ['A', 'B', 'C'];
        }
    }
    initLayout(rows, cols) {
        this.state.layout.rows = rows;
        this.state.layout.cols = cols;
        const seats = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                seats.push({ id: `${r}-${c}`, row: r, col: c, type: 'normal', groupId: Math.floor(c / 2) + 1 });
            }
        }
        this.state.layout.seats = seats;
        this.save();
    }
    load() {
        const data = localStorage.getItem('seat-shuffler-data');
        return data ? JSON.parse(data) : null;
    }
    save() {
        localStorage.setItem('seat-shuffler-data', JSON.stringify(this.state));
        this.notify();
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.state);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }
    notify() { this.listeners.forEach(listener => listener(this.state)); }
    setStudents(students) { this.state.students = students; this.save(); }
    updateLayout(layout) { this.state.layout = layout; this.save(); }
    setConstraints(constraints) { this.state.constraints = constraints; this.save(); }
    setCurrentSeating(seating) { this.state.currentSeating = seating; this.save(); }
    addHistory(seating, name = '') {
        this.state.history.push({ 
            date: new Date().toISOString(), 
            seating: seating,
            name: name || `${new Date().toLocaleDateString()} 席替え`
        });
        this.save();
    }
    setBadges(badges) { this.state.badges = badges; this.save(); }
}
window.store = new Store();
