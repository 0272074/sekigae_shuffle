class HistoryView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'history-view-container fade-in';
    }
    render() {
        const state = window.store.state;
        const history = state.history;
        
        this.container.innerHTML = `
            <div class="glass-panel">
                <header class="view-header">
                    <h2>履歴管理データ操作</h2>
                    <p>すべてのデータをファイルにバックアップしたり、復元できます</p>
                </header>
                
                <div class="data-actions glass-panel-nested">
                    <h3> データのエクスポート / インポート</h3>
                    <p class="data-summary">
                        現在のデータ: 
                        <strong>${state.students.length}</strong>名の児童、
                        <strong>${state.layout.rows}${state.layout.cols}</strong>の座席配置、
                        <strong>${state.constraints.length}</strong>件の条件、
                        <strong>${state.history.length}</strong>件の履歴
                    </p>
                    <div class="action-row">
                        <button id="export-json-btn" class="btn-primary"> すべてのデータをエクスポート</button>
                        <input type="file" id="import-json-input" style="display:none" accept=".json">
                        <button id="import-json-btn" class="btn-secondary"> データをインポート</button>
                    </div>
                    <div id="export-preview" class="export-preview hidden">
                        <h4>エクスポートデータ</h4>
                        <p class="hint">下のテキストをコピーしてテキストファイルに保存してください（拡張子は .json）</p>
                        <textarea id="export-textarea" readonly></textarea>
                        <button id="copy-export-btn" class="btn-secondary"> コピー</button>
                    </div>
                </div>
                
                <div class="danger-zone glass-panel-nested">
                    <h3> データのリセット</h3>
                    <button id="reset-btn" class="btn-delete">すべてのデータを削除</button>
                </div>

                <div class="history-list-section">
                    <h3> 席替え履歴</h3>
                    <div id="history-list">
                        ${history.length === 0 ? '<p class="empty-msg">履歴がありません</p>' : this.renderHistoryList(history)}
                    </div>
                </div>
            </div>`;
        this.attachEvents();
        return this.container;
    }
    
    renderHistoryList(history) {
        return history.map((h, index) => `
            <div class="history-item glass-panel-nested" data-index="${index}">
                <div class="history-info">
                    <span class="history-name">${h.name || '名称なし'}</span>
                    <span class="date">${new Date(h.date).toLocaleString()}</span>
                    <span class="count">${h.seating.length} 名</span>
                </div>
                <div class="history-actions">
                    <button class="btn-secondary small-btn load-history-btn" data-index="${index}">読み込み</button>
                    <button class="btn-delete small-btn delete-history-btn" data-index="${index}">削除</button>
                </div>
            </div>`).reverse().join('');
    }
    
    attachEvents() {
        this.container.querySelector('#export-json-btn').onclick = () => {
            const dataStr = JSON.stringify(window.store.state, null, 2);
            const date = new Date().toISOString().split('T')[0];
            const filename = `seat-shuffler-backup-${date}.json`;
            
            try {
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                setTimeout(() => {
                    if (confirm('ダウンロードが開始されましたか？\nされていない場合は「キャンセル」を押してください。')) {
                    } else {
                        this.showExportPreview(dataStr);
                    }
                }, 500);
            } catch (e) {
                this.showExportPreview(dataStr);
            }
        };
        
        this.container.querySelector('#copy-export-btn').onclick = () => {
            const textarea = this.container.querySelector('#export-textarea');
            textarea.select();
            document.execCommand('copy');
            window.showToast('コピーしました！');
        };
        
        const input = this.container.querySelector('#import-json-input');
        this.container.querySelector('#import-json-btn').onclick = () => input.click();
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (!data.students || !data.layout) throw new Error('Invalid data structure');
                    
                    if (confirm(`インポートしますか？\n\n- 児童: ${data.students.length}名\n- 履歴: ${(data.history || []).length}件`)) {
                        window.store.state = data;
                        window.store.save();
                        location.reload();
                    }
                } catch(err) {
                    alert('エラー: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        
        this.container.querySelector('#reset-btn').onclick = () => {
            if (confirm('本当にすべてのデータを削除しますか？')) {
                localStorage.removeItem('seat-shuffler-data');
                location.reload();
            }
        };
        
        const historyList = this.container.querySelector('#history-list');
        historyList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-history-btn')) {
                const idx = parseInt(e.target.dataset.index);
                if (confirm('この履歴を削除しますか？')) {
                    window.store.state.history.splice(idx, 1);
                    window.store.save();
                    this.refreshHistoryList();
                    window.showToast('履歴を削除しました');
                }
            }
            if (e.target.classList.contains('load-history-btn')) {
                const idx = parseInt(e.target.dataset.index);
                const historyItem = window.store.state.history[idx];
                if (confirm('この履歴を現在の席替え結果として読み込みますか？')) {
                    window.store.setCurrentSeating(historyItem.seating);
                    window.showToast('読み込みました');
                }
            }
        });
    }
    
    showExportPreview(dataStr) {
        const preview = this.container.querySelector('#export-preview');
        const textarea = this.container.querySelector('#export-textarea');
        preview.classList.remove('hidden');
        textarea.value = dataStr;
    }
    
    refreshHistoryList() {
        const history = window.store.state.history;
        this.container.querySelector('#history-list').innerHTML = 
            history.length === 0 ? '<p class="empty-msg">履歴がありません</p>' : this.renderHistoryList(history);
    }
}
window.Views['history'] = HistoryView;
