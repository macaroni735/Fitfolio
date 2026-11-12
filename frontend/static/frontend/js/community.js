document.addEventListener("DOMContentLoaded", () => {
    const typeFilters = document.getElementById("type-filters");
    const searchModeInput = document.getElementById("search-mode");
    const searchModeButtons = document.querySelectorAll(".search-mode-btn");
    const tagSearchPanel = document.getElementById("tag-search-panel");
    const keywordSearchPanel = document.getElementById("keyword-search-panel");
    const forSaleCheckbox = document.getElementById("for-sale-only");
    const budgetField = document.getElementById("budget-field");
    const tagList = document.getElementById("community-tag-list");
    const tagEntry = document.getElementById("community-tag-entry");
    const tagValues = document.getElementById("community-tag-values");
    const TYPE_EXCLUSIVE = new Set(["all", "outfits", "clothing"]);

    let selectedTags = Array.from(tagValues?.querySelectorAll('input[name="tag"]') || [])
        .map(input => normalizeTag(input.value))
        .filter(Boolean);

    function normalizeTag(value) {
        return String(value || "")
            .replaceAll(",", " ")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
    }

    function syncTagValues() {
        if (!tagValues) {
            return;
        }

        tagValues.replaceChildren(...selectedTags.map(tag => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "tag";
            input.value = tag;
            return input;
        }));
    }

    function renderTags() {
        if (!tagList || !tagEntry) {
            return;
        }

        tagList.replaceChildren(...selectedTags.map((tag, index) => {
            const chip = document.createElement("span");
            chip.className = "community-tag-chip";

            const label = document.createElement("span");
            label.textContent = tag;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "community-tag-remove";
            removeButton.setAttribute("aria-label", `Remove ${tag}`);
            removeButton.textContent = "×";
            removeButton.addEventListener("click", () => {
                selectedTags.splice(index, 1);
                renderTags();
                tagEntry.focus();
            });

            chip.append(label, removeButton);
            return chip;
        }));

        tagEntry.placeholder = selectedTags.length
            ? ""
            : "Type a tag, then Enter";
        syncTagValues();
    }

    function addTag(rawValue) {
        const tag = normalizeTag(rawValue);
        if (!tag || selectedTags.includes(tag)) {
            tagEntry.value = "";
            return;
        }

        selectedTags.push(tag);
        tagEntry.value = "";
        renderTags();
    }

    function setSearchMode(mode) {
        const nextMode = mode === "keyword" || mode === "name" ? "keyword" : "tags";
        searchModeInput.value = nextMode;
        searchModeButtons.forEach(button => {
            button.classList.toggle("active", button.dataset.searchMode === nextMode);
        });
        tagSearchPanel.hidden = nextMode !== "tags";
        keywordSearchPanel.hidden = nextMode !== "keyword";
    }

    function syncBudgetVisibility() {
        budgetField.hidden = !forSaleCheckbox.checked;
    }

    function handleTypeChange(changedInput) {
        if (!typeFilters || !changedInput) {
            return;
        }

        const inputs = Array.from(
            typeFilters.querySelectorAll('input[type="checkbox"][name="type"]')
        );
        const value = changedInput.value;

        if (!changedInput.checked) {
            if (!inputs.some(input => input.checked)) {
                const allInput = inputs.find(input => input.value === "all");
                if (allInput) {
                    allInput.checked = true;
                }
            }
            return;
        }

        if (TYPE_EXCLUSIVE.has(value)) {
            inputs.forEach(input => {
                if (input !== changedInput) {
                    input.checked = false;
                }
            });
            return;
        }

        inputs.forEach(input => {
            if (TYPE_EXCLUSIVE.has(input.value)) {
                input.checked = false;
            }
        });
    }

    if (typeFilters) {
        typeFilters.addEventListener("change", event => {
            if (event.target.matches('input[type="checkbox"][name="type"]')) {
                handleTypeChange(event.target);
            }
        });
    }

    searchModeButtons.forEach(button => {
        button.addEventListener("click", () => {
            setSearchMode(button.dataset.searchMode);
        });
    });

    if (forSaleCheckbox) {
        forSaleCheckbox.addEventListener("change", syncBudgetVisibility);
    }

    if (tagEntry) {
        tagEntry.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(tagEntry.value);
                return;
            }

            if (event.key === "Backspace" && tagEntry.value === "" && selectedTags.length) {
                selectedTags.pop();
                renderTags();
            }
        });

        tagEntry.addEventListener("blur", () => {
            if (tagEntry.value.trim()) {
                addTag(tagEntry.value);
            }
        });
    }

    renderTags();
    setSearchMode(searchModeInput?.value || "tags");
    syncBudgetVisibility();
});

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
