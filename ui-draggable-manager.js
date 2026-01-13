// ui-draggable-manager.js
document.addEventListener("DOMContentLoaded", () => {
    /**
     * =============================================
     * MANAGER UTAMA DRAGGABLE UI
     * =============================================
     */
    
    class DraggableUIManager {
        constructor() {
            this.draggableElements = new Map();
            this.activeDrag = null;
            this.snapThreshold = 20;
            this.init();
        }
        
        init() {
            console.log('Draggable UI Manager initialized');
            this.loadAllPositions();
            this.autoDetectDraggables();
            this.setupGlobalControls();
        }
        
        /**
         * Auto-detect elemen dengan kelas tertentu
         */
        autoDetectDraggables() {
            // Player List
            const playerList = document.getElementById('player-list');
            if (playerList) {
                this.makeDraggable(playerList, {
                    saveKey: 'playerList',
                    defaultPosition: { left: '20px', top: '20px' }
                });
            }
            
            // Shop Modal
            const shopModal = document.getElementById('shop-modal');
            if (shopModal) {
                const shopHeader = shopModal.querySelector('.shop-header, .modal-header');
                this.makeDraggable(shopModal, {
                    handle: shopHeader || shopModal,
                    saveKey: 'shopModal',
                    defaultPosition: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
                });
            }
            
            // Stats Panel
            const statsPanel = document.getElementById('stats-panel');
            if (statsPanel) {
                this.makeDraggable(statsPanel, {
                    saveKey: 'statsPanel',
                    defaultPosition: { right: '20px', top: '100px' }
                });
            }
            
            // Power-up Panel
            const powerUpPanel = document.getElementById('power-up-panel');
            if (powerUpPanel) {
                this.makeDraggable(powerUpPanel, {
                    saveKey: 'powerUpPanel',
                    defaultPosition: { right: '20px', top: '250px' },
                    onDragStart: (el) => this.addMinimizeButton(el)
                });
            }
            
            // Mini-map
            const miniMap = document.getElementById('mini-map');
            if (miniMap) {
                this.setupMinimap(miniMap);
            }
        }
        
        /**
         * Membuat elemen menjadi draggable
         */
        makeDraggable(element, options = {}) {
            const config = {
                handle: element,
                saveKey: element.id,
                bounds: true,
                snapToEdges: false,
                onDragStart: null,
                onDrag: null,
                onDragEnd: null,
                defaultPosition: null,
                ...options
            };
            
            // Tambah kelas CSS
            element.classList.add('draggable-ui');
            
            // Load posisi yang disimpan
            this.loadPosition(config.saveKey, element, config.defaultPosition);
            
            // Setup event listeners
            const handle = config.handle;
            let isDragging = false;
            let offsetX, offsetY;
            let startX, startY;
            let originalZIndex;
            
            const startDrag = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                isDragging = true;
                this.activeDrag = element;
                
                const clientX = this.getClientX(e);
                const clientY = this.getClientY(e);
                
                const rect = element.getBoundingClientRect();
                offsetX = clientX - rect.left;
                offsetY = clientY - rect.top;
                startX = rect.left;
                startY = rect.top;
                
                originalZIndex = element.style.zIndex;
                element.style.zIndex = '10000';
                element.classList.add('dragging-active');
                
                // Callback onDragStart
                if (config.onDragStart) config.onDragStart(element, e);
                
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('touchmove', doDrag, { passive: false });
                document.addEventListener('mouseup', stopDrag);
                document.addEventListener('touchend', stopDrag);
            };
            
            const doDrag = (e) => {
                if (!isDragging) return;
                
                const clientX = this.getClientX(e);
                const clientY = this.getClientY(e);
                
                let newX = clientX - offsetX;
                let newY = clientY - offsetY;
                
                // Boundary check
                if (config.bounds) {
                    newX = Math.max(0, Math.min(newX, window.innerWidth - element.offsetWidth));
                    newY = Math.max(0, Math.min(newY, window.innerHeight - element.offsetHeight));
                }
                
                element.style.left = newX + 'px';
                element.style.top = newY + 'px';
                element.style.right = 'auto';
                element.style.bottom = 'auto';
                
                // Snap to edges jika diaktifkan
                if (config.snapToEdges) {
                    this.checkSnapToEdges(element, newX, newY);
                }
                
                // Callback onDrag
                if (config.onDrag) config.onDrag(element, newX, newY, e);
            };
            
            const stopDrag = () => {
                if (!isDragging) return;
                
                isDragging = false;
                this.activeDrag = null;
                
                element.style.zIndex = originalZIndex || '';
                element.classList.remove('dragging-active');
                
                // Save position
                if (config.saveKey) {
                    this.savePosition(config.saveKey, {
                        left: element.style.left,
                        top: element.style.top,
                        width: element.style.width,
                        height: element.style.height
                    });
                }
                
                // Callback onDragEnd
                if (config.onDragEnd) config.onDragEnd(element);
                
                document.removeEventListener('mousemove', doDrag);
                document.removeEventListener('touchmove', doDrag);
                document.removeEventListener('mouseup', stopDrag);
                document.removeEventListener('touchend', stopDrag);
            };
            
            // Attach event listeners
            handle.addEventListener('mousedown', startDrag);
            handle.addEventListener('touchstart', startDrag, { passive: false });
            
            // Store for cleanup
            this.draggableElements.set(element, {
                handle,
                startDrag,
                doDrag,
                stopDrag,
                config
            });
            
            console.log(`Made draggable: ${config.saveKey}`);
        }
        
        /**
         * Setup khusus untuk mini-map (dengan resize)
         */
        setupMinimap(miniMap) {
            // Style dasar
            miniMap.style.cssText += `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 150px;
                height: 150px;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #a855f7;
                border-radius: 10px;
                z-index: 900;
                cursor: move;
                resize: both;
                overflow: hidden;
            `;
            
            // Buat draggable
            this.makeDraggable(miniMap, {
                saveKey: 'miniMap',
                defaultPosition: { right: '20px', bottom: '20px' }
            });
            
            // Tambah resize handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'ui-resize-handle';
            resizeHandle.innerHTML = '↘';
            resizeHandle.style.cssText = `
                position: absolute;
                bottom: 2px;
                right: 2px;
                width: 20px;
                height: 20px;
                background: rgba(168, 85, 247, 0.5);
                border-radius: 3px;
                cursor: nwse-resize;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: white;
                user-select: none;
            `;
            miniMap.appendChild(resizeHandle);
            
            // Resize functionality
            let isResizing = false;
            let startWidth, startHeight, startX, startY;
            
            resizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                isResizing = true;
                const rect = miniMap.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                startX = e.clientX;
                startY = e.clientY;
                
                document.addEventListener('mousemove', doResize);
                document.addEventListener('mouseup', stopResize);
            });
            
            const doResize = (e) => {
                if (!isResizing) return;
                
                const newWidth = Math.max(100, startWidth + (e.clientX - startX));
                const newHeight = Math.max(100, startHeight + (e.clientY - startY));
                
                miniMap.style.width = newWidth + 'px';
                miniMap.style.height = newHeight + 'px';
            };
            
            const stopResize = () => {
                isResizing = false;
                this.savePosition('miniMap', {
                    left: miniMap.style.left,
                    top: miniMap.style.top,
                    width: miniMap.style.width,
                    height: miniMap.style.height
                });
                
                document.removeEventListener('mousemove', doResize);
                document.removeEventListener('mouseup', stopResize);
            };
        }
        
        /**
         * Tambah tombol minimize untuk panel
         */
        addMinimizeButton(panel) {
            if (panel.querySelector('.ui-minimize-btn')) return;
            
            const btn = document.createElement('button');
            btn.className = 'ui-minimize-btn';
            btn.innerHTML = '−';
            btn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                width: 24px;
                height: 24px;
                border: none;
                background: #6b7280;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                z-index: 1001;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            btn.onclick = (e) => {
                e.stopPropagation();
                const content = panel.querySelector('.panel-content, .content');
                if (content) {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? 'block' : 'none';
                    btn.innerHTML = isHidden ? '−' : '+';
                    
                    // Simpan state
                    this.savePosition(panel.id, {
                        left: panel.style.left,
                        top: panel.style.top,
                        minimized: !isHidden
                    });
                }
            };
            
            panel.style.position = 'relative';
            panel.appendChild(btn);
            
            // Load minimized state
            const saved = this.loadPosition(panel.id, panel);
            if (saved && saved.minimized) {
                const content = panel.querySelector('.panel-content, .content');
                if (content) {
                    content.style.display = 'none';
                    btn.innerHTML = '+';
                }
            }
        }
        
        /**
         * Helper functions
         */
        getClientX(e) {
            return e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        }
        
        getClientY(e) {
            return e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        }
        
        checkSnapToEdges(element, x, y) {
            const threshold = this.snapThreshold;
            const width = element.offsetWidth;
            const height = element.offsetHeight;
            
            // Snap to left
            if (x < threshold) {
                element.style.left = '10px';
            }
            // Snap to right
            else if (x > window.innerWidth - width - threshold) {
                element.style.left = (window.innerWidth - width - 10) + 'px';
            }
            // Snap to top
            if (y < threshold) {
                element.style.top = '10px';
            }
            // Snap to bottom
            else if (y > window.innerHeight - height - threshold) {
                element.style.top = (window.innerHeight - height - 10) + 'px';
            }
        }
        
        /**
         * Save/Load positions
         */
        savePosition(key, position) {
            try {
                const positions = JSON.parse(localStorage.getItem('ui_positions') || '{}');
                positions[key] = position;
                localStorage.setItem('ui_positions', JSON.stringify(positions));
                return true;
            } catch (e) {
                console.error('Failed to save position:', e);
                return false;
            }
        }
        
        loadPosition(key, element, defaultPosition = null) {
            try {
                const positions = JSON.parse(localStorage.getItem('ui_positions') || '{}');
                const pos = positions[key];
                
                if (pos) {
                    if (pos.left && pos.top) {
                        element.style.left = pos.left;
                        element.style.top = pos.top;
                        element.style.position = 'fixed';
                        element.style.right = 'auto';
                        element.style.bottom = 'auto';
                    }
                    if (pos.width && pos.height) {
                        element.style.width = pos.width;
                        element.style.height = pos.height;
                    }
                    return pos;
                }
            } catch (e) {
                console.error('Failed to load position:', e);
            }
            
            // Gunakan default position jika ada
            if (defaultPosition) {
                Object.assign(element.style, defaultPosition);
            }
            
            return null;
        }
        
        loadAllPositions() {
            console.log('Loading all UI positions...');
            // Posisi akan diload saat masing-masing elemen dibuat draggable
        }
        
        /**
         * Global controls dan utility functions
         */
        setupGlobalControls() {
            // Reset semua posisi UI
            window.resetAllUIPositions = () => {
                if (confirm('Reset semua posisi UI ke default?')) {
                    this.draggableElements.forEach((config, element) => {
                        element.style.left = '';
                        element.style.top = '';
                        element.style.right = '';
                        element.style.bottom = '';
                        element.style.position = '';
                        element.style.width = '';
                        element.style.height = '';
                        element.classList.remove('dragging-active');
                    });
                    
                    localStorage.removeItem('ui_positions');
                    location.reload();
                }
            };
            
            // Toggle semua UI
            window.toggleAllUI = () => {
                let allHidden = true;
                
                this.draggableElements.forEach((config, element) => {
                    if (element.style.display !== 'none') {
                        allHidden = false;
                    }
                });
                
                this.draggableElements.forEach((config, element) => {
                    element.style.display = allHidden ? 'block' : 'none';
                });
                
                // Simpan visibility state
                this.savePosition('ui_visibility', { allVisible: !allHidden });
            };
            
            // Lock/Unlock semua UI (non-draggable)
            window.lockAllUI = (lock = true) => {
                this.draggableElements.forEach((config, element) => {
                    const handle = config.handle;
                    if (lock) {
                        handle.style.cursor = 'default';
                        handle.removeEventListener('mousedown', config.startDrag);
                        handle.removeEventListener('touchstart', config.startDrag);
                        element.classList.add('ui-locked');
                    } else {
                        handle.style.cursor = 'move';
                        handle.addEventListener('mousedown', config.startDrag);
                        handle.addEventListener('touchstart', config.startDrag, { passive: false });
                        element.classList.remove('ui-locked');
                    }
                });
            };
            
            // Save positions sekarang
            window.saveUIPositionsNow = () => {
                this.draggableElements.forEach((config, element) => {
                    if (config.config.saveKey) {
                        this.savePosition(config.config.saveKey, {
                            left: element.style.left,
                            top: element.style.top,
                            width: element.style.width,
                            height: element.style.height
                        });
                    }
                });
                alert('Posisi UI disimpan!');
            };
        }
        
        /**
         * Cleanup
         */
        cleanup() {
            this.draggableElements.forEach((config, element) => {
                const { handle, startDrag } = config;
                handle.removeEventListener('mousedown', startDrag);
                handle.removeEventListener('touchstart', startDrag);
            });
            this.draggableElements.clear();
        }
    }
    
    /**
     * =============================================
     * INISIALISASI DAN STYLE CSS
     * =============================================
     */
    
    // Tambah style CSS
    const style = document.createElement('style');
    style.textContent = `
        .draggable-ui {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            user-select: none;
        }
        
        .draggable-ui:hover {
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .draggable-ui.dragging-active {
            opacity: 0.9;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transform: scale(1.01);
            cursor: grabbing !important;
        }
        
        .ui-locked {
            opacity: 0.7;
            cursor: default !important;
        }
        
        .ui-locked:hover {
            box-shadow: none !important;
        }
        
        .ui-resize-handle:hover {
            background: rgba(168, 85, 247, 0.8) !important;
        }
        
        .ui-minimize-btn:hover {
            background: #4b5563 !important;
            transform: scale(1.1);
        }
        
        /* Player List khusus */
        #player-list.draggable-ui {
            background: rgba(30, 41, 59, 0.9);
            border: 2px solid #475569;
            border-radius: 10px;
            padding: 10px;
            min-width: 200px;
            color: white;
        }
        
        #player-list.draggable-ui .player-item {
            padding: 5px;
            border-bottom: 1px solid #475569;
        }
        
        /* Shop Modal khusus */
        #shop-modal.draggable-ui .modal-header {
            cursor: move;
            background: linear-gradient(45deg, #7c3aed, #4f46e5);
            color: white;
            padding: 15px;
            border-radius: 10px 10px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .draggable-ui {
                max-width: 90vw !important;
            }
            
            #mini-map.draggable-ui {
                width: 120px !important;
                height: 120px !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    /**
     * =============================================
     * EKSEKUSI UTAMA
     * =============================================
     */
    
    // Tunggu sebentar untuk memastikan elemen DOM siap
    setTimeout(() => {
        const uiManager = new DraggableUIManager();
        
        // Ekspos ke global scope untuk debugging/control
        window.uiManager = uiManager;
        
        // Auto-hide UI saat game dimulai (jika ada)
        if (typeof GameState !== 'undefined' && GameState.isPlaying) {
            setTimeout(() => {
                document.querySelectorAll('.draggable-ui').forEach(el => {
                    el.style.opacity = '0.7';
                    el.style.pointerEvents = 'none';
                });
            }, 1000);
        }
        
        // Reset UI posisi dengan double-click pada body
        let lastClick = 0;
        document.body.addEventListener('dblclick', (e) => {
            if (e.target === document.body || e.target.classList.contains('game-container')) {
                const now = Date.now();
                if (now - lastClick < 300) { // Triple click
                    if (confirm('Reset semua posisi UI?')) {
                        uiManager.cleanup();
                        localStorage.removeItem('ui_positions');
                        location.reload();
                    }
                }
                lastClick = now;
            }
        });
        
        console.log('🎮 Draggable UI Manager siap!');
        console.log('📌 Commands: resetAllUIPositions(), toggleAllUI(), lockAllUI(), saveUIPositionsNow()');
        
    }, 100);
    
    /**
     * =============================================
     * FALLBACK - jika ada elemen spesifik yang perlu
     * =============================================
     */
    
    // Fallback untuk player-list (original code)
    const playerList = document.getElementById('player-list');
    if (playerList && !playerList.classList.contains('draggable-ui')) {
        console.log('Using fallback draggable for player-list');
        
        let isDragging = false;
        let offsetX, offsetY;
        
        const startDrag = (e) => {
            isDragging = true;
            const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
            
            const rect = playerList.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            
            document.addEventListener("mousemove", doDrag);
            document.addEventListener("touchmove", doDrag, { passive: false });
            document.addEventListener("mouseup", stopDrag);
            document.addEventListener("touchend", stopDrag);
        };
        
        const doDrag = (e) => {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();
            
            const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
            
            playerList.style.left = (clientX - offsetX) + "px";
            playerList.style.top = (clientY - offsetY) + "px";
            playerList.style.bottom = "auto";
            playerList.style.right = "auto";
        };
        
        const stopDrag = () => {
            isDragging = false;
            document.removeEventListener("mousemove", doDrag);
            document.removeEventListener("touchmove", doDrag);
            document.removeEventListener("mouseup", stopDrag);
            document.removeEventListener("touchend", stopDrag);
            
            // Save position
            try {
                const positions = JSON.parse(localStorage.getItem('ui_positions') || '{}');
                positions.playerList = {
                    left: playerList.style.left,
                    top: playerList.style.top
                };
                localStorage.setItem('ui_positions', JSON.stringify(positions));
            } catch (e) {
                console.error('Failed to save position:', e);
            }
        };
        
        playerList.addEventListener("mousedown", startDrag);
        playerList.addEventListener("touchstart", startDrag, { passive: false });
        
        // Load position
        try {
            const positions = JSON.parse(localStorage.getItem('ui_positions') || '{}');
            if (positions.playerList) {
                playerList.style.left = positions.playerList.left;
                playerList.style.top = positions.playerList.top;
                playerList.style.position = 'fixed';
            }
        } catch (e) {
            console.error('Failed to load position:', e);
        }
    }
});

/**
 * =============================================
 * EXPORT FUNCTIONS UNTUK FILE LAIN
 * =============================================
 */

// Fungsi untuk membuat elemen draggable dari file lain
window.makeElementDraggable = function(elementId, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element ${elementId} not found`);
        return false;
    }
    
    if (window.uiManager) {
        window.uiManager.makeDraggable(element, options);
        return true;
    } else {
        console.error('UI Manager not initialized');
        return false;
    }
};

// Fungsi untuk mendapatkan posisi UI
window.getUIPosition = function(elementId) {
    try {
        const positions = JSON.parse(localStorage.getItem('ui_positions') || '{}');
        return positions[elementId] || null;
    } catch (e) {
        console.error('Failed to get UI position:', e);
        return null;
    }
};

// Fungsi untuk menyimpan posisi UI manual
window.saveUIPosition = function(elementId, position) {
    try {
        const positions = JSON.parse(localStorage.getItem('ui_positions') || '{}');
        positions[elementId] = position;
        localStorage.setItem('ui_positions', JSON.stringify(positions));
        return true;
    } catch (e) {
        console.error('Failed to save UI position:', e);
        return false;
    }
};