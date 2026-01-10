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
                    <p>クラスのメンバーを登録してください（Excelインポート対応）</p>
                </header>
                
                <div class="import-export-section glass-panel-nested" style="margin-bottom:1.5rem; background:#f0f9ff; border:1px solid #bae6fd;">
                    <h3> ExcelCSV連携</h3>
                    <p class="hint">Excelで名簿を作成して一括登録できます。</p>
                    <div class="action-row">
                        <button id="download-template-btn" class="btn-secondary small-btn"> テンプレートをダウンロード</button>
                        <input type="file" id="csv-upload-input" accept=".csv" style="display:none">
                        <button id="upload-csv-btn" class="btn-accent small-btn"> Excel(CSV)をインポート</button>
                    </div>
                </div>

                <div class="badge-settings glass-panel-nested">
                    <h3> バッジ設定</h3>
                    <div class="badge-list">
                        ${this.badges.map((b, i) => `<span class="badge-item badge-${b}" data-badge="${b}">${b}</span>`).join('')}
                        <button id="add-badge-btn" class="btn-small">+ 追加</button>
                    </div>
                </div>
                
                <div class="action-bar">
                    <button id="add-student-btn" class="btn-primary">+ 児童を追加</button>
                    <span class="student-count">現在の人数: <strong>${this.students.length}</strong>名</span>
                </div>
                <div class="table-wrapper">
                    <table class="student-table">
                        <thead>
                            <tr><th>番号</th><th>名前</th><th>性別</th><th>バッジ</th><th>操作</th></tr>
                        </thead>
                        <tbody id="student-list-body">${this.renderStudentRows()}</tbody>
                    </table>
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
        // Excel/CSV Handling
        this.container.querySelector('#download-template-btn').onclick = () => {
            const header = '出席番号,名前,性別(男/女),バッジ(カンマ区切り)\n';
            const example = '1,山田 太郎,男,A\n2,佐藤 花子,女,B\n';
            // Add BOM for Excel utf-8 support
            const content = '\uFEFF' + header + example;
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'student_list_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        const uploadInput = this.container.querySelector('#csv-upload-input');
        this.container.querySelector('#upload-csv-btn').onclick = () => uploadInput.click();
        
        uploadInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                this.parseCSV(text);
                uploadInput.value = ''; // Reset
            };
            reader.readAsText(file);
        };

        // Existing Events
        this.container.querySelector('#add-student-btn').onclick = () => {
            this.updateLocalData();
            this.students.push({ id: this.students.length + 1, name: '', gender: '', badges: [] });
            this.saveAndRefresh();
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

    parseCSV(text) {
        const lines = text.split(/\r\n|\n/);
        const newStudents = [];
        let startIndex = 1; // Skip header usually, but check
        
        // Simple detection if first line is header
        if (lines[0].includes('名前') || lines[0].includes('出席番号')) {
            startIndex = 1;
        } else {
            startIndex = 0;
        }

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, '')); // Remove quotes
            if (cols.length < 2) continue;

            const id = parseInt(cols[0]) || (newStudents.length + 1);
            const name = cols[1];
            let gender = '';
            if (cols[2] === '男' || cols[2] === 'male') gender = 'male';
            if (cols[2] === '女' || cols[2] === 'female') gender = 'female';
            
            // Badge handling
            const badges = [];
            if (cols[3]) {
                const bList = cols[3].split(/;|:/); // allow ; or : as internal separator? or just assume single badge if comma conflict
                // Actually CSV standard prevents easy nested commas without quotes.
                // Let's assume badges are simple strings.
                if (this.badges.includes(cols[3])) badges.push(cols[3]);
            }

            newStudents.push({ id, name, gender, badges });
        }

        if (newStudents.length > 0) {
           if (confirm(`${newStudents.length}名のデータを読み込みました。\n既存のリストに追加しますか？\n（キャンセルを押すと上書きされます）`)) {
               this.updateLocalData();
               this.students = [...this.students, ...newStudents];
           } else {
               this.students = newStudents;
           }
           this.saveAndRefresh();
           window.showToast('インポートが完了しました');
        } else {
            alert('有効なデータが見つかりませんでした');
        }
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
        const countDisplay = this.container.querySelector('.student-count strong');
        if (countDisplay) countDisplay.textContent = this.students.length;
    }
}
window.Views['input'] = InputView;


