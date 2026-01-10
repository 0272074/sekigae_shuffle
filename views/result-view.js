class ResultView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'result-view-container fade-in';
        this.shuffler = new window.SeatShuffler();
        this.resultSeating = null;
        this.selectedSeat = null;
    }
    render() {
        this.container.innerHTML = `
            <div class="glass-panel">
                <header class="view-header"><h2>席替え結果</h2><p>生成された案を確認してください。座席をクリックして入れ替えることも可能です。</p></header>
                <div class="result-actions-bar">
                    <button id="regenerate-btn" class="btn-secondary"> 別の案を生成</button>
                    <button id="save-history-btn" class="btn-primary"> 確定履歴に保存</button>
                </div>
                <div id="result-grid-wrapper" class="grid-wrapper">
                    <div class="grid-container-with-header" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                        <div class="blackboard-indicator">黒板 (前方)</div>
                        <div id="result-grid" class="seats-grid" style="grid-template-columns: repeat(${window.store.state.layout.cols}, 1fr);"></div>
                    </div>
                </div>
            </div>`;
        this.attachEvents();
        setTimeout(() => this.runShuffle(), 100);
        return this.container;
    }
    runShuffle() {
        const result = this.shuffler.generate(window.store.state.students, window.store.state.layout, window.store.state.constraints);
        if (result) {
            this.resultSeating = result;
            this.renderResultGrid();
        } else {
            this.container.querySelector('#result-grid').innerHTML = '<div class="error-msg">条件を満たす配置が見つかりませんでした。条件を緩和してください。</div>';
        }
    }
    renderResultGrid() {
        const grid = this.container.querySelector('#result-grid');
        const layout = window.store.state.layout;
        const students = window.store.state.students;
        grid.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
        grid.innerHTML = layout.seats.map(seat => {
            const assignment = this.resultSeating.find(a => a.seatId === seat.id);
            const student = assignment ? students.find(s => s.id == assignment.studentId) : null;
            const badges = student && student.badges ? student.badges.map(b => `<span class="mini-badge badge-${b}">${b}</span>`).join('') : '';
            return `
                <div class="seat-cell result-cell ${seat.type} ${this.selectedSeat === seat.id ? 'selected' : ''}" data-seat-id="${seat.id}">
                    <span class="seat-coord">${seat.row + 1}-${seat.col + 1}</span>
                    <div class="student-name">${student ? (student.name || student.id) : (seat.type === 'forbidden' ? 'ー' : '')}</div>
                    ${badges ? `<div class="badges-row">${badges}</div>` : ''}
                </div>`;
        }).join('');
    }
    attachEvents() {
        this.container.querySelector('#regenerate-btn').onclick = () => this.runShuffle();
        this.container.querySelector('#save-history-btn').onclick = () => this.showSaveDialog();
        this.container.querySelector('#result-grid').onclick = (e) => {
            const cell = e.target.closest('.seat-cell');
            if (cell) {
                const seatId = cell.dataset.seatId;
                if (this.selectedSeat) {
                    if (this.selectedSeat !== seatId) this.swapSeats(this.selectedSeat, seatId);
                    this.selectedSeat = null;
                } else this.selectedSeat = seatId;
                this.renderResultGrid();
            }
        };
    }
    showSaveDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'save-dialog-overlay';
        const date = new Date();
        const defaultName = `${date.getMonth()+1}/${date.getDate()} 席替え`;
        overlay.innerHTML = `
            <div class="save-dialog">
                <h3> 履歴に保存</h3>
                <p>この席替え結果に名前を付けてください：</p>
                <input type="text" id="history-name-input" value="${defaultName}" placeholder="例: 4月席替え">
                <div class="save-dialog-buttons">
                    <button class="btn-secondary" id="cancel-save-btn">キャンセル</button>
                    <button class="btn-primary" id="confirm-save-btn">保存</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        
        const input = overlay.querySelector('#history-name-input');
        input.select();
        
        overlay.querySelector('#cancel-save-btn').onclick = () => overlay.remove();
        overlay.querySelector('#confirm-save-btn').onclick = () => {
            const name = input.value.trim() || defaultName;
            window.store.setCurrentSeating(this.resultSeating);
            window.store.addHistory(this.resultSeating, name);
            overlay.remove();
            window.showToast(' 履歴に保存しました: ' + name);
        };
        
        // Enter key to save
        input.onkeydown = (e) => {
            if (e.key === 'Enter') overlay.querySelector('#confirm-save-btn').click();
        };
    }
    swapSeats(id1, id2) {
        const idx1 = this.resultSeating.findIndex(a => a.seatId === id1);
        const idx2 = this.resultSeating.findIndex(a => a.seatId === id2);
        if (idx1 !== -1 && idx2 !== -1) {
            const temp = this.resultSeating[idx1].studentId;
            this.resultSeating[idx1].studentId = this.resultSeating[idx2].studentId;
            this.resultSeating[idx2].studentId = temp;
        }
    }
}
window.Views['result'] = ResultView;
