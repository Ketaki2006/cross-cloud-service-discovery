/**
 * Cross-Cloud Service Discovery Registry - Shared Frontend Configuration
 */
window.APP_CONFIG = {
    API_BASE: "http://localhost:3000",
    CONSUL_URL: "http://localhost:8500",
    PAYMENT_URL: "http://127.0.0.1:8001"
};

// Safe HTML escaping helper to prevent XSS
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"'`=\/]/g, function (s) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
            "/": "&#x2F;",
            "`": "&#x60;",
            "=": "&#x3D;"
        }[s];
    });
}

// Global Toast Notification Helper
function showToast(message, type = "success") {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `fixed bottom-6 right-6 z-50 transform transition-all duration-300 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg font-label-md text-label-md ${
        type === "error" ? "bg-error text-on-error" : (type === "warning" ? "bg-secondary-container text-on-secondary-container" : "bg-inverse-surface text-inverse-on-surface")
    }`;
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
    setTimeout(() => {
        toast.style.transform = "translateY(6rem)";
        toast.style.opacity = "0";
    }, 3500);
}

// Initialize backend connectivity indicator across all pages
document.addEventListener("DOMContentLoaded", () => {
    const apiPill = document.querySelector(".express-api-pill");
    if (!apiPill) return;

    fetch(`${window.APP_CONFIG.API_BASE}/api`)
        .then(res => res.json())
        .then(data => {
            const dot = apiPill.querySelector(".api-status-dot");
            const text = apiPill.querySelector(".api-status-text");
            if (dot) {
                dot.className = "inline-block w-2 h-2 rounded-full bg-tertiary-container";
                dot.title = "Backend Online (port 3000)";
            }
            if (text) {
                text.textContent = "Express API: :3000 (Connected)";
            }
        })
        .catch(() => {
            const dot = apiPill.querySelector(".api-status-dot");
            const text = apiPill.querySelector(".api-status-text");
            if (dot) {
                dot.className = "inline-block w-2 h-2 rounded-full bg-error";
                dot.title = "Backend Offline - Run 'node server.js'";
            }
            if (text) {
                text.textContent = "Express API: :3000 (Offline)";
            }
        });
});
