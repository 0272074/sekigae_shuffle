class UsageView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'usage-view-container fade-in';
    }

    render() {
        this.container.innerHTML = `
            <div class="glass-panel usage-content">
                <header class="view-header" style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 2rem; color: var(--primary-dark);"> 使い方ガイド</h2>
                    <p>Seat Shufflerを最大限に活用するための4ステップ解説です。</p>
                </header>

                <div class="usage-steps">
                    <!-- Step 1 -->
                    <div class="usage-step-card glass-panel-nested">
                        <div class="step-badge">1</div>
                        <div class="step-text">
                            <h3>児童生徒データの入力</h3>
                            <p>出席番号、名前、性別を登録します。バッジ機能を使って特定のグループ（配慮が必要な子、掃除当番など）を作ることもできます。Excel(CSV)での一括登録にも対応しています。</p>
                        </div>
                        <div class="usage-img-wrapper">
                            <img src="images/usage_1.png" alt="Step 1" class="usage-img">
                        </div>
                    </div>

                    <!-- Step 2 -->
                    <div class="usage-step-card glass-panel-nested">
                        <div class="step-badge">2</div>
                        <div class="step-text">
                            <h3>座席配置班の設定</h3>
                            <p>教室の座席を自由にレイアウトします。座席をクリックして「男子限定」「女子限定」「使用不可」などの属性を切り替えられます。班番号を入力すれば、色分け表示にも対応します。</p>
                        </div>
                        <div class="usage-img-wrapper">
                            <img src="images/usage_2.png" alt="Step 2" class="usage-img">
                        </div>
                    </div>

                    <!-- Step 3 -->
                    <div class="usage-step-card glass-panel-nested">
                        <div class="step-badge">3</div>
                        <div class="step-text">
                            <h3>席替え条件の設定</h3>
                            <p>「この二人は離したい」「前回と同じ席はNG」などの条件を細かく設定できます。履歴機能を使えば、長期間にわたって公平な席替えが可能です。</p>
                        </div>
                        <div class="usage-img-wrapper">
                            <img src="images/usage_3.png" alt="Step 3" class="usage-img">
                        </div>
                    </div>

                    <!-- Step 4 -->
                    <div class="usage-step-card glass-panel-nested">
                        <div class="step-badge">4</div>
                        <div class="step-text">
                            <h3>結果確認 ＆ 発表モード</h3>
                            <p>生成された結果を確認し、微調整も可能です。盛り上がる「発表モード」では、アニメーションと共に新しい席が順次公開されます！</p>
                        </div>
                        <div class="usage-img-wrapper">
                            <img src="images/usage_4.png" alt="Step 4" class="usage-img">
                        </div>
                    </div>
                </div>

                <div class="usage-footer" style="margin-top: 3rem; text-align: center; padding: 2rem;">
                    <button id="start-app-btn" class="btn-primary" style="padding: 1.2rem 4rem; font-size: 1.3rem; border-radius: 50px; cursor: pointer; transform: scale(1); transition: 0.3s;">さっそく使ってみる</button>
                    <p style="margin-top: 1rem; color: #718096; font-size: 0.9rem;">設定はいつでも上の「使い方」ボタンから確認できます。</p>
                </div>
            </div>`;

        this.attachEvents();
        return this.container;
    }

    attachEvents() {
        this.container.querySelector('#start-app-btn').onclick = () => {
            window.app.switchView('input');
        };
        this.container.querySelector('#start-app-btn').onmouseover = (e) => {
            e.target.style.transform = 'scale(1.05)';
        };
        this.container.querySelector('#start-app-btn').onmouseout = (e) => {
            e.target.style.transform = 'scale(1)';
        };
    }
}
window.Views['usage'] = UsageView;
