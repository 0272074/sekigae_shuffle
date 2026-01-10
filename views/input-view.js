class InputView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'input-view-container fade-in';
        this.students = JSON.parse(JSON.stringify(window.store.state.students));
        this.badges = window.store.state.badges || ['A', 'B', 'C'];
    }
    render() {
        this.container.innerHTML = `
            <div class="glass-panel">
                <header class="view-header">
                    <h2>児童生徒データ入力</h2>
                    <p>クラスのメンバーを登録してください。バッジを付けると条件設定で活用できます。</p>
                </header>
                
                <div class="badge-settings glass-panel-nested">
                    <h3> バッジ設定</h3>
                    <p class="hint">バッジを使って児童をグループ化できます（例: 配慮が必要、リーダー候補など）</p>
                    <div class="badge-list">
                        ${this.badges.map((b, i) => `<span class="badge-item badge-${b}" data-badge="${b}">${b}</span>`).join('')}
                        <button id="add-badge-btn" class="btn-small">+ 追加</button>
                    </div>
                </div>
                
                <div class="action-bar">
                    <button id="add-student-btn" class="btn-primary">+ 児童を追加</button>
                </div>
                <div class="table-wrapper">
                    <table class="student-table">
                        <thead>
                            <tr><th>番号</th><th>名前</th><th>性別</th><th>バッジ</th><th>操作</th></tr>
                        </thead>
                        <tbody id="student-list-body">${this.renderStudentRows()}</tbody>
                    </table>
                </div>
                <div class="view-footer">
                    <button id="save-students-btn" class="btn-save">保存して次へ</button>
                </div>
            </div>`;
        this.attachEvents();
        return this.container;
    }
    renderStudentRows() {
        if (this.students.length === 0) return '<tr><td colspan="5" class="empty-msg">生徒が登録されていません</td></tr>';
        return this.students.map((s, index) => `
            <tr data-index="${index}">
                <td><input type="number" value="${s.id || index + 1}" class="table-input id-input" style="width:60px"></td>
                <td><input type="text" value="${s.name || ''}" placeholder="名前" class="table-input name-input"></td>
                <td>
                    <select class="table-input gender-input">
                        <option value="" ${!s.gender ? 'selected' : ''}>-</option>
                        <option value="male" ${s.gender === 'male' ? 'selected' : ''}>男</option>
                        <option value="female" ${s.gender === 'female' ? 'selected' : ''}>女</option>
                    </select>
                </td>
                <td>
                    <div class="badge-selector">
                        ${this.badges.map(b => `<label class="badge-checkbox"><input type="checkbox" value="${b}" ${(s.badges || []).includes(b) ? 'checked' : ''}><span class="badge-label badge-${b}">${b}</span></label>`).join('')}
                    </div>
                </td>
                <td><button class="btn-delete delete-student-btn" data-index="${index}">削除</button></td>
            </tr>`).join('');
    }
    attachEvents() {
        this.container.querySelector('#add-student-btn').onclick = () => {
            this.updateLocalData();
            this.students.push({ id: this.students.length + 1, name: '', gender: '', badges: [] });
            this.saveAndRefresh();
        };
        this.container.querySelector('#save-students-btn').onclick = () => {
            this.updateLocalData();
            window.store.setStudents(this.students);
            window.store.setBadges(this.badges);
            window.app.switchView('layout');
        };
        this.container.querySelector('#add-badge-btn').onclick = () => {
            const name = prompt('新しいバッジの名前（1〜3文字推奨）:');
            if (name && name.trim()) {
                this.badges.push(name.trim().substring(0, 3));
                window.store.setBadges(this.badges);
                this.saveAndRefresh();
            }
        };
        this.container.querySelector('#student-list-body').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-student-btn')) {
                const index = parseInt(e.target.dataset.index);
                this.updateLocalData();
                this.students.splice(index, 1);
                this.saveAndRefresh();
            }
        });
        this.container.querySelector('#student-list-body').addEventListener('change', () => {
            this.updateLocalData();
            window.store.setStudents(this.students);
        });
    }
    updateLocalData() {
        const rows = this.container.querySelectorAll('#student-list-body tr[data-index]');
        if (rows.length === 0) return;
        this.students = Array.from(rows).map(row => {
            const badgeCheckboxes = row.querySelectorAll('.badge-checkbox input:checked');
            return {
                id: parseInt(row.querySelector('.id-input').value),
                name: row.querySelector('.name-input').value,
                gender: row.querySelector('.gender-input').value,
                badges: Array.from(badgeCheckboxes).map(cb => cb.value)
            };
        });
    }
    saveAndRefresh() {
        window.store.setStudents(this.students);
        this.container.querySelector('#student-list-body').innerHTML = this.renderStudentRows();
    }
}
window.Views['input'] = InputView;
