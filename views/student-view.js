class StudentView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'student-view-container fade-in';
        this.currentSeating = window.store.state.currentSeating;
        this.students = window.store.state.students;
        this.layout = window.store.state.layout;
        this.lastHistory = window.store.state.history.length > 0 
            ? window.store.state.history[window.store.state.history.length - 1].seating 
            : null;
        this.isAnimating = false;
        this.cells = [];
        this.showGroupBorder = false;
    }
    
    render() {
        if (!this.currentSeating) {
            this.container.innerHTML = '<div class="glass-panel centered-panel"><h2>準備中...</h2><p>先生が席替えを完了するのをお待ちください</p><button id="back-btn" class="btn-secondary">戻る</button></div>';
            this.attachEvents();
            return this.container;
        }

        // Use div instead of header to avoid CSS hiding
        this.container.innerHTML = `
            <div class="student-ui" style="position:relative; min-height:100vh; overflow:hidden;">
                <div class="view-header" style="position:relative; z-index:10; background:rgba(255,255,255,0.8); width:100%; padding:1rem; border-radius:0 0 16px 16px; display:flex; justify-content:space-between; align-items:center;">
                     <h2>席替え発表！</h2>
                     <div class="view-toggle-area">
                         <label class="checkbox-item" title="班ごとに色分けして表示">
                             <input type="checkbox" id="student-group-border-toggle" ${this.showGroupBorder ? 'checked' : ''}>
                             <span style="font-size:0.9rem; font-weight:bold; color:#4a5568;">班区切り</span>
                         </label>
                         <button id="back-to-result-btn" class="btn-secondary small-btn"> 戻る</button>
                     </div>
                </div>
                
                <div class="blackboard-indicator" style="z-index:1; margin-top:1rem;">黒板 (前方)</div>
                
                <div id="student-grid-container" style="position:relative; width: 100%; max-width:1000px; margin:0 auto; flex:1;">
                    <!-- Grid background (Only for layout reference, borders handled by cards now) -->
                    <div id="student-bg-grid" class="seats-grid" style="grid-template-columns: repeat(${this.layout.cols}, 1fr); opacity:0.3; pointer-events:none;">
                        ${this.renderBgGrid()}
                    </div>
                    
                    <!-- Floating student cards will be injected here -->
                    <div id="cards-layer" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
                </div>

                <div class="reveal-controls" style="position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); z-index:100;">
                    <button id="start-reveal-btn" class="btn-reveal">席替えスタート！</button>
                </div>
            </div>`;
        
        setTimeout(() => this.prepareCards(), 100);
        this.attachEvents();
        return this.container;
    }

    renderBgGrid() {
        // Just empty slots visual reference
        return this.layout.seats.map(seat => {
            return `<div class="seat-cell ${seat.type}" style="border:2px dashed #e2e8f0; background:transparent;"></div>`;
        }).join('');
    }

    prepareCards() {
        const layer = this.container.querySelector('#cards-layer');
        const gridRef = this.container.querySelector('.seats-grid');
        if (!layer || !gridRef) return;

        const gap = 12;
        const cellWidth = (gridRef.clientWidth - (gap * (this.layout.cols - 1))) / this.layout.cols;
        const cellHeight = 80;

        layer.innerHTML = '';
        this.cells = [];

        this.students.forEach(student => {
            let startRow = 0, startCol = 0, startOpacity = 0;

            if (this.lastHistory) {
                const lastAssign = this.lastHistory.find(a => a.studentId == student.id);
                if (lastAssign) {
                    const lastSeat = this.layout.seats.find(s => s.id === lastAssign.seatId);
                    if (lastSeat) { startRow = lastSeat.row; startCol = lastSeat.col; startOpacity = 1; }
                }
            }
            if (!this.lastHistory) { startRow = this.layout.rows / 2; startCol = this.layout.cols / 2; startOpacity = 0; }

            const currentAssign = this.currentSeating.find(a => a.studentId == student.id);
            if (!currentAssign) return;
            const targetSeat = this.layout.seats.find(s => s.id === currentAssign.seatId);
            
            const card = document.createElement('div');
            card.className = 'student-card-floating';
            card.textContent = student.name;
            card.style.position = 'absolute';
            card.style.width = `${cellWidth}px`;
            card.style.height = `${cellHeight}px`;
            card.style.left = `${startCol * (cellWidth + gap)}px`;
            card.style.top = `${startRow * (cellHeight + gap)}px`;
            card.style.opacity = startOpacity;
            
            // Initial styling & Data
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'center';
            card.style.background = 'white';
            card.style.border = '2px solid #4a5568';
            card.style.borderRadius = '8px';
            card.style.fontWeight = 'bold';
            card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            card.style.zIndex = '10';
            
            // Store group info
            const groupId = targetSeat.groupId;
            if (groupId) {
                const colorIndex = (groupId % 8) || 8;
                card.dataset.groupClass = `group-color-${colorIndex}`;
                
                // Create badge element (hidden initially or always visible?)
                // Hidden initially, show when landed if toggle is ON
                const badge = document.createElement('span');
                badge.className = 'group-badge';
                badge.textContent = groupId;
                badge.style.display = 'none'; // manage via JS
                card.appendChild(badge);
            }

            layer.appendChild(card);
            
            this.cells.push({
                element: card,
                student: student,
                targetX: targetSeat.col * (cellWidth + gap),
                targetY: targetSeat.row * (cellHeight + gap),
                startX: startCol * (cellWidth + gap),
                startY: startRow * (cellHeight + gap),
                groupId: groupId
            });
        });
        
        // Apply initial styles if toggle is already ON (useful for re-render or hot reload)
        this.updateCardStyles();
    }

    attachEvents() {
        const startBtn = this.container.querySelector('#start-reveal-btn');
        if (startBtn) startBtn.onclick = () => { if (!this.isAnimating) this.runAnimationScript(); };
        
        const backBtn = this.container.querySelector('#back-to-result-btn') || this.container.querySelector('#back-btn');
        if (backBtn) backBtn.onclick = () => window.app.switchView('result');

        this.container.querySelector('#student-group-border-toggle').onchange = (e) => {
            this.showGroupBorder = e.target.checked;
            this.updateCardStyles();
        };
    }
    
    updateCardStyles() {
        // Apply or remove styles based on toggle
        this.cells.forEach(item => {
            const card = item.element;
            const badge = card.querySelector('.group-badge');
            
            // Only apply special styles if landed OR if not animating yet (initial state)
            // But actually, we want to show group colors when they land.
            // If we apply immediately, they might have colors during shuffle, which is fine.
            
            if (this.showGroupBorder && card.dataset.groupClass) {
                // We add the class, but we need to ensure it overrides default border
                card.classList.add(card.dataset.groupClass);
                // Also ensure border width is thicker
                card.classList.add('with-group-style');
                if (badge) badge.style.display = 'flex';
            } else {
                if (card.dataset.groupClass) card.classList.remove(card.dataset.groupClass);
                card.classList.remove('with-group-style');
                if (badge) badge.style.display = 'none';
            }
        });
    }

    runAnimationScript() {
        this.isAnimating = true;
        const btn = this.container.querySelector('#start-reveal-btn');
        btn.textContent = 'シャッフル中...';
        btn.disabled = true;

        const layer = this.container.querySelector('#cards-layer');
        const centerX = layer.clientWidth / 2 - 40;
        const centerY = layer.clientHeight / 2 - 40;

        // Phase 1: Shuffle
        this.cells.forEach(item => {
            item.element.style.opacity = '1';
            item.element.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
            const randX = (Math.random() - 0.5) * 300;
            const randY = (Math.random() - 0.5) * 300;
            item.element.style.transform = `translate(${randX}px, ${randY}px) rotate(${Math.random()*360}deg)`;
            item.element.style.left = `${centerX}px`;
            item.element.style.top = `${centerY}px`;
            item.element.style.zIndex = '100';
            item.element.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            
            // Hide group info during shuffle for surprise
            if (item.element.querySelector('.group-badge')) item.element.querySelector('.group-badge').style.opacity = '0';
            item.element.classList.remove('with-group-style'); 
        });

        // Phase 2: Land one by one slowly
        setTimeout(() => {
            btn.textContent = '決定！';
            this.cells.forEach((item, index) => {
                setTimeout(() => {
                    item.element.style.transition = 'all 1.0s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    item.element.style.transform = 'none';
                    item.element.style.left = `${item.targetX}px`;
                    item.element.style.top = `${item.targetY}px`;
                    item.element.style.zIndex = '10';
                    item.element.classList.add('landed');
                    item.element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    
                    // Re-apply group styles if toggle is ON
                    if (this.showGroupBorder) {
                        if (item.element.dataset.groupClass) item.element.classList.add(item.element.dataset.groupClass);
                        item.element.classList.add('with-group-style');
                        if (item.element.querySelector('.group-badge')) item.element.querySelector('.group-badge').style.opacity = '1';
                    }
                    
                }, index * 400); 
            });

            setTimeout(() => {
                this.isAnimating = false;
                btn.textContent = '完了！';
                btn.style.display = 'none';
                window.showToast('席替え完了！');
            }, this.cells.length * 400 + 1500);

        }, 2000);
    }
}
window.Views['student'] = StudentView;
