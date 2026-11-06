document.addEventListener("click", async event => {
    const button = event.target.closest(".copy-seller-email");
    if (!button) {
        return;
    }

    const email = (button.dataset.email || "").trim();
    if (!email) {
        return;
    }

    const wrap = button.closest(".copy-seller-email-wrap");
    const toast = wrap?.querySelector(".copy-seller-email-toast");

    try {
        await navigator.clipboard.writeText(email);
    } catch {
        window.prompt("Copy this seller email:", email);
        return;
    }

    if (!toast) {
        return;
    }

    if (toast._hideTimeout) {
        window.clearTimeout(toast._hideTimeout);
    }

    toast.hidden = false;
    toast._hideTimeout = window.setTimeout(() => {
        toast.hidden = true;
        toast._hideTimeout = null;
    }, 1600);
});
