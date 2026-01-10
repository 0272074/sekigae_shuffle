class LayoutView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'layout-view-container fade-in';
        this.layout = JSON.parse(JSON.stringify(window.store.state.layout));
    }
    render() {
        this.container.innerHTML = `
            <div class="glass-panel">
                <header class="view-header">
                    <h2>座席班レイアウト設定</h2>
                    <p>教室の座席配置と班の割り当てを設定してください</p>
                </header>
                <div class="layout-settings-bar">
                    <div class="setting-item"><label>縦（奥行）:</label><input type="number" id="rows-input" value="${this.layout.rows}" min="1" max="10"></div>
                    <div class="setting-item"><label>横（幅）:</label><input type="number" id="cols-input" value="${this.layout.cols}" min="1" max="10"></div>
                    <button id="apply-grid-btn" class="btn-secondary">グリッド更新</button>
                    <div class="spacer"></div>
                </div>
                <div class="layout-legend glass-panel-nested">
                    <p><strong>座席をクリック</strong>して種類を変更できます：</p>
                    <div class="legend-items">
                        <span class="legend-item"><span class="box normal"></span> 通常（使用する）</span>
                        <span class="legend-item"><span class="box forbidden"></span> 使用しない</span>
                        <span class="legend-item"><span class="box boys"></span> 男子のみ</span>
                        <span class="legend-item"><span class="box girls"></span> 女子のみ</span>
                    </div>
                </div>
                <div class="grid-wrapper">
                    <div class="grid-container-with-header" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                        <div class="blackboard-indicator">黒板 (前方)</div>
                        <div id="seats-grid" class="seats-grid" style="grid-template-columns: repeat(${this.layout.cols}, 1fr);">${this.renderSeats()}</div>
                    </div>
                </div>
                <div class="view-footer"><button id="save-layout-btn" class="btn-save">保存して次へ</button></div>
            </div>`;
        this.attachEvents();
        return this.container;
    }
    renderSeats() {
        const typeLabels = { normal: '通常', forbidden: '不可', boys: '男子', girls: '女子' };
        return this.layout.seats.map((seat, index) => `
            <div class="seat-cell clickable-seat ${seat.type}" data-index="${index}" title="クリックで種類を変更">
                <div class="seat-type-label">${typeLabels[seat.type] || '通常'}</div>
                <div class="seat-info">
                    <span class="seat-coord">${seat.row + 1}-${seat.col + 1}</span>
                    <div class="group-row">
                        <span class="group-label">班:</span>
                        <input type="number" class="group-input" value="${seat.groupId || ''}" min="1" onclick="event.stopPropagation()">
                    </div>
                </div>
            </div>`).join('');
    }
    attachEvents() {
        const grid = this.container.querySelector('#seats-grid');
        
        // Click on seat to cycle type
        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.seat-cell');
            if (cell && !e.target.classList.contains('group-input')) {
                const index = parseInt(cell.dataset.index);
                this.cycleSeatType(index);
                this.saveAndRefreshGrid();
            }
        });
        
        // Group input change
        grid.addEventListener('change', (e) => {
            if (e.target.classList.contains('group-input')) {
                const cell = e.target.closest('.seat-cell');
                const index = parseInt(cell.dataset.index);
                this.layout.seats[index].groupId = parseInt(e.target.value) || 0;
                window.store.updateLayout(this.layout);
            }
        });
        
        this.container.querySelector('#apply-grid-btn').onclick = () => {
            this.reinitGrid(parseInt(this.container.querySelector('#rows-input').value), parseInt(this.container.querySelector('#cols-input').value));
        };
        this.container.querySelector('#save-layout-btn').onclick = () => {
            window.store.updateLayout(this.layout);
            window.app.switchView('conditions');
        };
    }
    cycleSeatType(index) {
        const types = ['normal', 'forbidden', 'boys', 'girls'];
        const currentType = this.layout.seats[index].type || 'normal';
        const nextIndex = (types.indexOf(currentType) + 1) % types.length;
        this.layout.seats[index].type = types[nextIndex];
    }
    reinitGrid(r, c) {
        this.layout.rows = r; this.layout.cols = c;
        const newSeats = [];
        for (let i = 0; i < r; i++) {
            for (let j = 0; j < c; j++) {
                const existing = this.layout.seats.find(s => s.row === i && s.col === j);
                newSeats.push(existing || { id: `${i}-${j}`, row: i, col: j, type: 'normal', groupId: Math.floor(j/2)+1 });
            }
        }
        this.layout.seats = newSeats;
        this.saveAndRefreshGrid();
    }
    saveAndRefreshGrid() {
        window.store.updateLayout(this.layout);
        const grid = this.container.querySelector('#seats-grid');
        grid.style.gridTemplateColumns = `repeat(${this.layout.cols}, 1fr)`;
        grid.innerHTML = this.renderSeats();
    }
}
window.Views['layout'] = LayoutView;
