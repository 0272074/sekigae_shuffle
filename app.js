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
    }
    init() {
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
        this.switchView('input');
        window.store.subscribe((state) => { console.log('State updated'); });
    }
    switchView(viewName) {
        this.currentView = viewName;
        this.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        this.viewContainer.innerHTML = '';
        try {
            const ViewClass = window.Views[viewName];
            if (!ViewClass) throw new Error(`View ${viewName} is not registered.`);
            const viewInstance = new ViewClass();
            this.viewContainer.appendChild(viewInstance.render());
        } catch (error) {
            console.error(`Error loading view ${viewName}:`, error);
            this.viewContainer.innerHTML = `<div class="error">エラーが発生しました: ${error.message}</div>`;
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
