// ==================== UI HANDLER SYSTEM ====================

// Fungsi untuk menyimpan posisi UI
function saveUIPosition(elementId, position) {
    try {
        const saved = JSON.parse(localStorage.getItem('cacing_ui_positions') || '{}');
        saved[elementId] = position;
        localStorage.setItem('cacing_ui_positions', JSON.stringify(saved));
    } catch(e) {
        console.error('Failed to save UI position:', e);
    }
}

// Fungsi untuk memuat posisi UI
function loadUIPosition(elementId) {
    try {
        const saved = JSON.parse(localStorage.getItem('cacing_ui_positions') || '{}');
        return saved[elementId];
    } catch(e) {
        console.error('Failed to load UI position:', e);
        return null;
    }
}

// Fungsi untuk membuat elemen draggable
function makeElementDraggable(elementId, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let isDragging = false;
    let offsetX, offsetY;

    // Load saved position
    const savedPos = loadUIPosition(elementId);
    if (savedPos) {
        element.style.left = savedPos.left;
        element.style.top = savedPos.top;
        if (savedPos.left && savedPos.top) {
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
    } else if (options.defaultPosition) {
        element.style.left = options.defaultPosition.left;
        element.style.top = options.defaultPosition.top;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
    }

    const startDragging = (e) => {
        isDragging = true;
        const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

        const rect = element.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;

        element.style.cursor = 'grabbing';
        element.style.opacity = '0.8';

        document.addEventListener("mousemove", drag);
        document.addEventListener("touchmove", drag, { passive: false });
        document.addEventListener("mouseup", stopDragging);
        document.addEventListener("touchend", stopDragging);
    };

    const drag = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();

        const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

        const left = (clientX - offsetX) + "px";
        const top = (clientY - offsetY) + "px";
        
        element.style.left = left;
        element.style.top = top;
        element.style.right = "auto";
        element.style.bottom = "auto";
        
        // Simpan posisi
        if (options.saveKey || elementId) {
            saveUIPosition(options.saveKey || elementId, { left, top });
        }
    };

    const stopDragging = () => {
        isDragging = false;
        element.style.cursor = 'move';
        element.style.opacity = '1';
        
        document.removeEventListener("mousemove", drag);
        document.removeEventListener("touchmove", drag);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("touchend", stopDragging);
    };

    // Tambahkan style untuk dragging
    element.style.position = 'absolute';
    element.style.cursor = 'move';
    element.style.zIndex = '1000';
    
    element.addEventListener("mousedown", startDragging);
    element.addEventListener("touchstart", startDragging, { passive: false });
}

// Fungsi untuk mendapatkan posisi UI
function getUIPosition(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    return {
        left: element.style.left,
        top: element.style.top,
        right: element.style.right,
        bottom: element.style.bottom
    };
}

// Inisialisasi UI dragging saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
    // Buat player-list draggable
    makeElementDraggable('player-list', {
        saveKey: 'playerList',
        defaultPosition: { left: 'calc(100% - 170px)', top: 'calc(100% - 280px)' }
    });

    // Buat chat-container draggable
    makeElementDraggable('chat-container', {
        saveKey: 'chatContainer',
        defaultPosition: { left: '20px', top: 'calc(100% - 280px)' }
    });

    // Buat minimap draggable
    makeElementDraggable('minimap', {
        saveKey: 'minimap',
        defaultPosition: { left: 'calc(100% - 200px)', top: 'calc(100% - 230px)' }
    });

    // Buat joy-zone draggable
    makeElementDraggable('joy-zone', {
        saveKey: 'joyZone',
        defaultPosition: { left: '50px', top: 'calc(100% - 210px)' }
    });

    console.log('UI Handler initialized');
});