class ConditionView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'condition-view-container fade-in';
        this.constraints = JSON.parse(JSON.stringify(window.store.state.constraints));
        this.students = window.store.state.students;
        this.layout = window.store.state.layout;
        this.badges = window.store.state.badges || [];
        this.history = window.store.state.history || [];
    }

    render() {
        const hasHistory = this.history.length > 0;
        const latestHistory = hasHistory ? this.history[this.history.length - 1] : null;
        
        this.container.innerHTML = `
            <div class="glass-panel">
                <header class="view-header">
                    <h2>条件設定</h2>
                    <p>児童ごとの条件と、全体条件を設定できます。</p>
                </header>
                
                <div class="global-constraints glass-panel-nested history-constraints">
                    <h3> 履歴ベース条件</h3>
                    ${hasHistory ? `<p class="hint">最新の履歴「${latestHistory.name || '名称なし'}」を参照します</p>` : '<p class="hint warning"> 履歴がありません。席替えを実行して保存すると使用できます。</p>'}
                    <div class="history-constraint-options">
                        <label class="checkbox-label">
                            <input type="checkbox" id="no-same-seat" ${this.hasGlobalConstraint('no_same_seat') ? 'checked' : ''} ${!hasHistory ? 'disabled' : ''}>
                            <span>同じ席になる児童がいないようにする</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="no-same-neighbor" ${this.hasGlobalConstraint('no_same_neighbor') ? 'checked' : ''} ${!hasHistory ? 'disabled' : ''}>
                            <span>同じ児童と隣（左右）にならないようにする</span>
                        </label>
                    </div>
                </div>
                
                <div class="global-constraints glass-panel-nested">
                    <h3> バッジ条件（全体）</h3>
                    <p class="hint">同じバッジを持つ児童同士の配置ルールを設定</p>
                    <div id="badge-constraints-list">
                        ${this.renderBadgeConstraints()}
                    </div>
                    <button id="add-badge-constraint-btn" class="btn-secondary">+ バッジ条件を追加</button>
                </div>
                
                <div class="student-conditions-list" id="student-conditions-list">
                    ${this.students.length === 0 ? '<p class="empty-msg">先に児童を登録してください</p>' : this.students.map(s => this.renderStudentCard(s)).join('')}
                </div>
                <div class="view-footer">
                    <button id="run-shuffle-btn" class="btn-save">席替えを実行！</button>
                </div>
            </div>`;
        this.attachEvents();
        return this.container;
    }

    hasGlobalConstraint(type) {
        return this.constraints.some(c => c.isGlobal && c.type === type);
    }

    renderBadgeConstraints() {
        const badgeConstraints = this.constraints.filter(c => c.isGlobal && (c.type === 'badge_together' || c.type === 'badge_apart'));
        if (badgeConstraints.length === 0) return '<p class="hint">バッジ条件なし</p>';
        
        return badgeConstraints.map((c, i) => {
            const idx = this.constraints.indexOf(c);
            return `
                <div class="constraint-editor-item badge-constraint" data-original-index="${idx}">
                    <select class="badge-select">
                        ${this.badges.map(b => `<option value="${b}" ${c.badge === b ? 'selected' : ''}>${b}</option>`).join('')}
                    </select>
                    <span>バッジの児童を</span>
                    <select class="badge-type-select">
                        <option value="badge_together" ${c.type === 'badge_together' ? 'selected' : ''}>なるべく近くに</option>
                        <option value="badge_apart" ${c.type === 'badge_apart' ? 'selected' : ''}>なるべく離す</option>
                    </select>
                    <button class="btn-delete-small"></button>
                </div>`;
        }).join('');
    }

    renderStudentCard(student) {
        const studentConstraints = this.constraints
            .map((c, idx) => ({ ...c, originalIndex: idx }))
            .filter(c => !c.isGlobal && String(c.studentId) === String(student.id));
        const badges = (student.badges || []).map(b => `<span class="mini-badge badge-${b}">${b}</span>`).join('');
        return `
            <div class="student-condition-card glass-panel-nested" data-student-id="${student.id}">
                <div class="student-card-header">
                    <span class="student-id">No.${student.id}</span>
                    <span class="student-card-name">${student.name || '名前なし'}</span>
                    ${badges}
                    <button class="add-constraint-btn-small" data-student-id="${student.id}">+ 条件追加</button>
                </div>
                <div class="student-constraints-list">
                    ${studentConstraints.map(c => this.renderConstraintEditor(c)).join('')}
                    ${studentConstraints.length === 0 ? '<p class="hint">個別条件なし</p>' : ''}
                </div>
            </div>`;
    }

    renderConstraintEditor(c) {
        const typeOptions = [
            { value: 'fixed', label: '場所指定' },
            { value: 'row_front', label: '前から列目まで' },
            { value: 'row_back', label: '後ろから列目まで' },
            { value: 'col_left', label: '左から列目まで' },
            { value: 'col_right', label: '右から列目まで' },
            { value: 'min_dist', label: '特定の児童と離す' },
            { value: 'max_dist', label: '特定の児童と近く' },
            { value: 'same_group', label: '同じ班にする' },
            { value: 'diff_group', label: '違う班にする' }
        ];

        return `
            <div class="constraint-editor-item" data-original-index="${c.originalIndex}">
                <select class="type-select">
                    ${typeOptions.map(opt => `<option value="${opt.value}" ${c.type === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                </select>
                <div class="type-specific-inputs">
                    ${this.renderSpecificInputs(c)}
                </div>
                <button class="btn-delete-small"></button>
            </div>`;
    }

    renderSpecificInputs(c) {
        const studentOptions = this.students.filter(s => String(s.id) !== String(c.studentId)).map(s => `<option value="${s.id}" ${String(s.id) === String(c.otherId) ? 'selected' : ''}>${s.name || s.id}</option>`).join('');
        
        if (c.type === 'fixed') {
            return `<input type="number" class="row-input small" value="${c.row || 1}" min="1"> 縦 / <input type="number" class="col-input small" value="${c.col || 1}" min="1"> 横`;
        }
        if (['row_front', 'row_back', 'col_left', 'col_right'].includes(c.type)) {
            const labels = { row_front: '前から', row_back: '後ろから', col_left: '左から', col_right: '右から' };
            return `${labels[c.type]} <input type="number" class="val-input small" value="${c.value || 1}" min="1"> 列目まで`;
        }
        if (c.type === 'min_dist' || c.type === 'max_dist') {
            return `<select class="other-select">${studentOptions}</select><span>から</span><input type="number" class="val-input small" value="${c.value || 2}" min="1"><span>マス${c.type === 'min_dist' ? '以上' : '以内'}</span>`;
        }
        if (c.type === 'same_group' || c.type === 'diff_group') {
            return `<select class="other-select">${studentOptions}</select><span>と${c.type === 'same_group' ? '同じ班' : '違う班'}</span>`;
        }
        return '';
    }

    attachEvents() {
        const listContainer = this.container.querySelector('#student-conditions-list');
        const badgeList = this.container.querySelector('#badge-constraints-list');
        
        // History-based constraint checkboxes
        const noSameSeatCb = this.container.querySelector('#no-same-seat');
        const noSameNeighborCb = this.container.querySelector('#no-same-neighbor');
        
        if (noSameSeatCb) {
            noSameSeatCb.onchange = () => {
                this.toggleGlobalConstraint('no_same_seat', noSameSeatCb.checked);
            };
        }
        if (noSameNeighborCb) {
            noSameNeighborCb.onchange = () => {
                this.toggleGlobalConstraint('no_same_neighbor', noSameNeighborCb.checked);
            };
        }
        
        // Add badge constraint
        this.container.querySelector('#add-badge-constraint-btn').onclick = () => {
            if (this.badges.length === 0) {
                alert('先に児童登録画面でバッジを作成してください');
                return;
            }
            this.syncData();
            this.constraints.push({ type: 'badge_together', badge: this.badges[0], isGlobal: true });
            this.saveAndRefresh();
        };
        
        // Badge constraint events
        badgeList.addEventListener('change', (e) => {
            const item = e.target.closest('.badge-constraint');
            if (!item) return;
            const idx = parseInt(item.dataset.originalIndex);
            this.syncData();
            if (e.target.classList.contains('badge-select')) {
                this.constraints[idx].badge = e.target.value;
            }
            if (e.target.classList.contains('badge-type-select')) {
                this.constraints[idx].type = e.target.value;
            }
            window.store.setConstraints(this.constraints);
        });
        
        badgeList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete-small')) {
                const idx = parseInt(e.target.closest('.badge-constraint').dataset.originalIndex);
                this.syncData();
                this.constraints.splice(idx, 1);
                this.saveAndRefresh();
            }
        });
        
        listContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-constraint-btn-small')) {
                const sid = e.target.dataset.studentId;
                this.syncData();
                this.constraints.push({ type: 'fixed', studentId: sid, row: 1, col: 1 });
                this.saveAndRefresh();
            }
            if (e.target.classList.contains('btn-delete-small')) {
                const idx = parseInt(e.target.closest('.constraint-editor-item').dataset.originalIndex);
                this.syncData();
                this.constraints.splice(idx, 1);
                this.saveAndRefresh();
            }
        });

        listContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('type-select')) {
                const idx = parseInt(e.target.closest('.constraint-editor-item').dataset.originalIndex);
                const newType = e.target.value;
                this.syncData();
                this.constraints[idx].type = newType;
                if (newType === 'fixed') { this.constraints[idx].row = 1; this.constraints[idx].col = 1; }
                if (['row_front', 'row_back', 'col_left', 'col_right'].includes(newType)) { 
                    this.constraints[idx].value = 1; 
                }
                if (['min_dist', 'max_dist', 'same_group', 'diff_group'].includes(newType)) {
                    this.constraints[idx].otherId = this.students.find(s => String(s.id) !== String(this.constraints[idx].studentId))?.id;
                    if (['min_dist', 'max_dist'].includes(newType)) this.constraints[idx].value = 2;
                }
                this.saveAndRefresh();
            }
            if (['row-input', 'col-input', 'val-input', 'other-select'].some(cls => e.target.classList.contains(cls))) {
                this.syncData();
                window.store.setConstraints(this.constraints);
            }
        });

        this.container.querySelector('#run-shuffle-btn').onclick = () => {
            this.syncData();
            window.store.setConstraints(this.constraints);
            window.app.switchView('result');
        };
    }

    toggleGlobalConstraint(type, enabled) {
        this.syncData();
        const existingIdx = this.constraints.findIndex(c => c.isGlobal && c.type === type);
        if (enabled && existingIdx === -1) {
            this.constraints.push({ type: type, isGlobal: true });
        } else if (!enabled && existingIdx !== -1) {
            this.constraints.splice(existingIdx, 1);
        }
        window.store.setConstraints(this.constraints);
    }

    syncData() {
        const items = this.container.querySelectorAll('.constraint-editor-item:not(.badge-constraint)');
        items.forEach(item => {
            const idx = parseInt(item.dataset.originalIndex);
            if (idx >= this.constraints.length) return;
            const typeSelect = item.querySelector('.type-select');
            if (!typeSelect) return;
            const type = typeSelect.value;
            this.constraints[idx].type = type;
            
            if (type === 'fixed') {
                const rowInput = item.querySelector('.row-input');
                const colInput = item.querySelector('.col-input');
                if (rowInput) this.constraints[idx].row = parseInt(rowInput.value) || 1;
                if (colInput) this.constraints[idx].col = parseInt(colInput.value) || 1;
            } else if (['row_front', 'row_back', 'col_left', 'col_right', 'min_dist', 'max_dist'].includes(type)) {
                const valInput = item.querySelector('.val-input');
                if (valInput) this.constraints[idx].value = parseInt(valInput.value) || 1;
                if (['min_dist', 'max_dist'].includes(type)) {
                    const otherSelect = item.querySelector('.other-select');
                    if (otherSelect) this.constraints[idx].otherId = otherSelect.value;
                }
            } else if (['same_group', 'diff_group'].includes(type)) {
                const otherSelect = item.querySelector('.other-select');
                if (otherSelect) this.constraints[idx].otherId = otherSelect.value;
            }
        });
    }

    saveAndRefresh() {
        window.store.setConstraints(this.constraints);
        const listContainer = this.container.querySelector('#student-conditions-list');
        const badgeList = this.container.querySelector('#badge-constraints-list');
        const scrollPos = listContainer.scrollTop;
        listContainer.innerHTML = this.students.length === 0 ? '<p class="empty-msg">先に児童を登録してください</p>' : this.students.map(s => this.renderStudentCard(s)).join('');
        badgeList.innerHTML = this.renderBadgeConstraints();
        listContainer.scrollTop = scrollPos;
    }
}
window.Views['conditions'] = ConditionView;
