class StudentView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'student-view-container fade-in';
        this.currentSeating = window.store.state.currentSeating;
        this.students = window.store.state.students;
        this.layout = window.store.state.layout;
        this.isAnimating = false;
        this.timer = null;
    }
    render() {
        if (!this.currentSeating) {
            this.container.innerHTML = '<div class="glass-panel centered-panel"><h2>準備中...</h2><p>先生が席替えを完了するのをお待ちください</p></div>';
            return this.container;
        }
        this.container.innerHTML = `
            <div class="student-ui">
                <div class="reveal-controls"><button id="start-reveal-btn" class="btn-reveal">席替えスタート！</button></div>
                <div class="grid-container-with-header" style="max-width: 1000px; width: 100%; display: flex; flex-direction: column; align-items: center;">
                    <div class="blackboard-indicator">黒板 (前方)</div>
                    <div id="student-grid" class="seats-grid" style="grid-template-columns: repeat(${this.layout.cols}, 1fr);">${this.renderEmptyGrid()}</div>
                </div>
            </div>`;
        this.attachEvents();
        return this.container;
    }
    renderEmptyGrid() { return this.layout.seats.map(seat => `<div class="seat-cell student-cell ${seat.type}" data-seat-id="${seat.id}"><div class="student-name">?</div></div>`).join(''); }
    attachEvents() { this.container.querySelector('#start-reveal-btn').onclick = () => { if (!this.isAnimating) this.startAnimation(); }; }
    startAnimation() {
        this.isAnimating = true; const btn = this.container.querySelector('#start-reveal-btn'); btn.textContent = 'シャッフル中...'; btn.disabled = true;
        let frames = 0; const maxFrames = 30; const cells = this.container.querySelectorAll('.student-cell');
        this.timer = setInterval(() => {
            frames++;
            cells.forEach(cell => {
                const seat = this.layout.seats.find(s => s.id === cell.dataset.seatId);
                if (seat.type === 'forbidden') return;
                cell.querySelector('.student-name').textContent = this.students[Math.floor(Math.random() * this.students.length)]?.name || '???';
                cell.style.transform = `translate(${(Math.random()-0.5)*5}px, ${(Math.random()-0.5)*5}px)`;
            });
            if (frames >= maxFrames) this.stopAnimation();
        }, 100);
    }
    stopAnimation() {
        clearInterval(this.timer); this.isAnimating = false; this.container.querySelector('#start-reveal-btn').textContent = '完了！';
        const cells = this.container.querySelectorAll('.student-cell');
        cells.forEach(cell => {
            const assignment = this.currentSeating.find(a => a.seatId === cell.dataset.seatId);
            const student = assignment ? this.students.find(s => s.id == assignment.studentId) : null;
            cell.style.transform = 'none'; cell.querySelector('.student-name').textContent = student ? (student.name || student.id) : '';
            if (student) cell.classList.add('revealed');
        });
    }
}
window.Views['student'] = StudentView;
