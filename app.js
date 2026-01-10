// Toast notification utility
window.showToast = function(message, duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

class App {
    constructor() {
        this.viewContainer = document.getElementById('view-container');
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.currentView = 'input';
        this.init();
        this.initModals();
    }
    
    init() {
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
        
        // Initial view
        this.switchView('input');
        
        // Store listener mainly for debug or global updates
        window.store.subscribe((state) => {
            // console.log('State updated', state);
        });
    }

    switchView(viewName) {
        this.currentView = viewName;
        if (viewName === 'student') { document.body.classList.add('presentation-mode'); } else { document.body.classList.remove('presentation-mode'); }
        this.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        this.viewContainer.innerHTML = '';
        try {
            const ViewClass = window.Views[viewName];
            if (!ViewClass) {
                // Compatibility for old "history" view request -> show modal instead
                if (viewName === 'history') {
                    this.openHistoryModal();
                    return;
                }
                throw new Error(`View ${viewName} is not registered.`);
            }
            const viewInstance = new ViewClass();
            this.viewContainer.appendChild(viewInstance.render());
        } catch (error) {
            console.error(`Error loading view ${viewName}:`, error);
            this.viewContainer.innerHTML = `<div class="error">エラーが発生しました: ${error.message}</div>`;
        }
    }

    initModals() {
        // Data Modal
        const dataModal = document.getElementById('data-modal');
        document.getElementById('header-data-btn').onclick = () => {
            dataModal.classList.add('show');
        };
        dataModal.querySelectorAll('.modal-close').forEach(btn => {
            btn.onclick = () => {
                dataModal.classList.remove('show');
                document.getElementById('modal-export-preview').classList.add('hidden');
            };
        });

        // Export Logic
        document.getElementById('modal-export-btn').onclick = () => {
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
                window.showToast(' ファイルを保存しました');
            } catch (e) {
                // Fallback
                const preview = document.getElementById('modal-export-preview');
                const textarea = document.getElementById('modal-export-textarea');
                preview.classList.remove('hidden');
                textarea.value = dataStr;
            }
        };

        document.getElementById('modal-copy-btn').onclick = () => {
             const textarea = document.getElementById('modal-export-textarea');
             textarea.select();
             document.execCommand('copy');
             window.showToast('クリップボードにコピーしました');
        };

        // Import Logic
        const importInput = document.getElementById('modal-import-input');
        document.getElementById('modal-import-btn').onclick = () => importInput.click();
        importInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (!data.students || !data.layout) throw new Error('Invalid data');
                    if (confirm(`インポートしてよろしいですか？\n現在のデータは上書きされます。`)) {
                        window.store.state = data;
                        window.store.save();
                        location.reload();
                    }
                } catch(err) {
                    alert('ファイルの読み込みに失敗しました: ' + err.message);
                }
            };
            reader.readAsText(file);
        };

        // Reset Logic
        document.getElementById('modal-reset-btn').onclick = () => {
            if (confirm('本当にすべてのデータを削除して初期化しますか？\nこの操作は取り消せません。')) {
                localStorage.removeItem('seat-shuffler-data');
                location.reload();
            }
        };

        // History Modal
        const historyModal = document.getElementById('history-modal');
        document.getElementById('header-history-btn').onclick = () => {
            this.renderHistoryList();
            historyModal.classList.add('show');
        };
        historyModal.querySelectorAll('.modal-close').forEach(btn => {
            btn.onclick = () => historyModal.classList.remove('show');
        });
    }

    renderHistoryList() {
        const historyList = document.getElementById('modal-history-list');
        const history = window.store.state.history || [];
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">履歴がありません</p>';
            return;
        }

        historyList.innerHTML = history.map((h, index) => `
            <div class="history-item glass-panel-nested" style="margin-bottom: 0.5rem; display:flex; justify-content:space-between; align-items:center;">
                <div class="history-info">
                    <span class="history-name" style="font-weight:bold; color:var(--accent);">${h.name || '名称なし'}</span>
                    <span class="date" style="font-size:0.8rem; color:#64748b; margin-left:0.5rem;">${new Date(h.date).toLocaleString()}</span>
                </div>
                <div class="history-actions">
                    <button class="btn-secondary small-btn" onclick="window.app.loadHistory(${index})">読み込み</button>
                    <button class="btn-delete small-btn" onclick="window.app.deleteHistory(${index})">削除</button>
                </div>
            </div>`).reverse().join('');
    }

    loadHistory(index) {
        if (confirm('この履歴を読み込みますか？\n現在の「結果確認」画面に表示されます。')) {
            const h = window.store.state.history[index];
            window.store.setCurrentSeating(h.seating);
            document.getElementById('history-modal').classList.remove('show');
            this.switchView('result');
            window.showToast('履歴を読み込みました');
        }
    }

    deleteHistory(index) {
        if (confirm('この履歴を削除しますか？')) {
            window.store.state.history.splice(index, 1);
            window.store.save();
            this.renderHistoryList();
            window.showToast('履歴を削除しました');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

