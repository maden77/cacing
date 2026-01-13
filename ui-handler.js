// ui-handler.js
document.addEventListener("DOMContentLoaded", () => {
    const playerList = document.getElementById("player-list");
    if (!playerList) return;

    let isDragging = false;
    let offsetX, offsetY;

    // Fungsi utama untuk menggeser
    const startDragging = (e) => {
        isDragging = true;
        const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

        const rect = playerList.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;

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

        playerList.style.left = (clientX - offsetX) + "px";
        playerList.style.top = (clientY - offsetY) + "px";
        playerList.style.bottom = "auto";
        playerList.style.right = "auto";
    };

    const stopDragging = () => {
        isDragging = false;
        document.removeEventListener("mousemove", drag);
        document.removeEventListener("touchmove", drag);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("touchend", stopDragging);
    };

    playerList.addEventListener("mousedown", startDragging);
    playerList.addEventListener("touchstart", startDragging, { passive: false });
});
