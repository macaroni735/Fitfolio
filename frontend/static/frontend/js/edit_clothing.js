document.addEventListener("DOMContentLoaded", () => {
    const clothingEditModal = document.getElementById("clothing-edit-modal");
    const editClothingForm = document.getElementById("edit-clothing-form");
    const closeClothingModal = document.getElementById("close-clothing-modal");
    const deleteClothingButton = document.getElementById("delete-clothing-action");
    const editClothingButtons = document.querySelectorAll(".edit-clothing-btn");

    if (!clothingEditModal || !editClothingForm) {
        return;
    }

    const nameInput = document.getElementById("edit-clothing-name");
    const descriptionInput = document.getElementById("edit-clothing-description");
    const categorySelect = document.getElementById("edit-clothing-category");
    const articleTypeSelect = document.getElementById("edit-clothing-article-type");
    const sizeInput = document.getElementById("edit-clothing-size");
    const tagEditor = document.getElementById("edit-tag-editor");
    const tagList = document.getElementById("edit-tag-list");
    const tagInput = document.getElementById("edit-clothing-tags");
    const tagsValueInput = document.getElementById("edit-clothing-tags-value");
    const countInput = document.getElementById("edit-clothing-count");
    const publishCheckbox = document.getElementById("edit-clothing-publish");
    const anonymousCheckbox = document.getElementById("edit-clothing-anonymous");
    const forSaleCheckbox = document.getElementById("edit-clothing-for-sale");
    const publishFields = document.getElementById("edit-publish-fields");
    const saleFields = document.getElementById("edit-sale-fields");
    const priceInput = document.getElementById("edit-clothing-price");
    const stockInput = document.getElementById("edit-clothing-stock");
    const galleryGrid = document.getElementById("edit-gallery-grid");
    const galleryInput = document.getElementById("edit-clothing-gallery");
    const status = document.getElementById("edit-clothing-status");
    const MAX_GALLERY_PHOTOS = 12;

    let activeClothingButton = null;
    let clothingTags = [];
    let galleryPhotos = [];
    let removedGalleryIds = new Set();
    let pendingGalleryFiles = [];
    let pendingGalleryKey = 0;

    function parseBoolean(value) {
        return String(value || "").toLowerCase() === "true";
    }

    function parseTags(raw) {
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter(tag => typeof tag === "string")
                    .map(normalizeTag)
                    .filter(Boolean)
                    .filter((tag, index, list) => list.indexOf(tag) === index);
            }
        } catch {
            // Fall through to comma-separated parsing.
        }

        return raw
            .split(",")
            .map(normalizeTag)
            .filter(Boolean)
            .filter((tag, index, list) => list.indexOf(tag) === index);
    }

    function normalizeTag(value) {
        return String(value || "")
            .replaceAll(",", " ")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
    }

    function syncTagsValue() {
        tagsValueInput.value = JSON.stringify(clothingTags);
    }

    function renderTags() {
        tagList.replaceChildren(...clothingTags.map((tag, index) => {
            const chip = document.createElement("span");
            chip.className = "edit-tag-chip";

            const label = document.createElement("span");
            label.textContent = tag;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "edit-tag-remove";
            removeButton.setAttribute("aria-label", `Remove ${tag}`);
            removeButton.textContent = "×";
            removeButton.addEventListener("click", () => {
                clothingTags.splice(index, 1);
                renderTags();
                tagInput.focus();
            });

            chip.append(label, removeButton);
            return chip;
        }));

        tagInput.placeholder = clothingTags.length
            ? ""
            : "Type a tag, then Enter";
        syncTagsValue();
    }

    function addTag(rawValue) {
        const tag = normalizeTag(rawValue);
        if (!tag || clothingTags.includes(tag)) {
            tagInput.value = "";
            return;
        }

        clothingTags.push(tag);
        tagInput.value = "";
        renderTags();
    }

    function parseGallery(raw) {
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed
                .filter(item => item && item.id != null && item.url)
                .map(item => ({
                    id: String(item.id),
                    url: String(item.url),
                }));
        } catch {
            return [];
        }
    }

    function keptGalleryCount() {
        return galleryPhotos.filter(photo => !removedGalleryIds.has(photo.id)).length;
    }

    function remainingGallerySlots() {
        return Math.max(0, MAX_GALLERY_PHOTOS - keptGalleryCount() - pendingGalleryFiles.length);
    }

    function clearPendingGallery() {
        pendingGalleryFiles.forEach(photo => URL.revokeObjectURL(photo.url));
        pendingGalleryFiles = [];
        galleryInput.value = "";
    }

    function createGalleryTile(imageUrl, onRemove) {
        const tile = document.createElement("div");
        tile.className = "edit-gallery-tile";

        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "Gallery photo";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "edit-gallery-remove";
        removeButton.setAttribute("aria-label", "Remove gallery photo");
        removeButton.textContent = "×";
        removeButton.addEventListener("click", onRemove);

        tile.append(image, removeButton);
        return tile;
    }

    function renderGallery() {
        galleryGrid.replaceChildren();

        galleryPhotos.forEach(photo => {
            if (removedGalleryIds.has(photo.id)) {
                return;
            }

            galleryGrid.append(createGalleryTile(photo.url, () => {
                removedGalleryIds.add(photo.id);
                renderGallery();
            }));
        });

        pendingGalleryFiles.forEach(photo => {
            galleryGrid.append(createGalleryTile(photo.url, () => {
                URL.revokeObjectURL(photo.url);
                pendingGalleryFiles = pendingGalleryFiles.filter(
                    pending => pending.key !== photo.key,
                );
                renderGallery();
            }));
        });

        if (remainingGallerySlots() > 0) {
            const addTile = document.createElement("button");
            addTile.type = "button";
            addTile.className = "edit-gallery-add";
            addTile.setAttribute("aria-label", "Add gallery photos");
            addTile.innerHTML = "<span>+</span>";
            addTile.addEventListener("click", () => {
                galleryInput.click();
            });
            galleryGrid.append(addTile);
        }
    }

    function formatPriceInput() {
        const parsed = Number.parseFloat(priceInput.value);
        const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        priceInput.value = amount.toFixed(2);
    }

    function syncStockLimit() {
        const count = Number.parseInt(countInput.value, 10);
        const maxStock = Number.isFinite(count) && count >= 0 ? count : 1;
        stockInput.max = String(maxStock);

        const stock = Number.parseInt(stockInput.value, 10);
        if (!Number.isFinite(stock) || stock < 0) {
            stockInput.value = "1";
            return;
        }

        if (stock > maxStock) {
            stockInput.value = String(maxStock);
        }
    }

    function updateDetailsVisibility() {
        const published = publishCheckbox.checked;
        const forSale = published && forSaleCheckbox.checked;

        publishFields.hidden = !published;
        saleFields.hidden = !forSale;

        if (forSale) {
            formatPriceInput();
            syncStockLimit();
        }
    }

    function syncAnonymousAndForSale(changed) {
        if (changed === "anonymous" && anonymousCheckbox.checked) {
            forSaleCheckbox.checked = false;
        }

        if (changed === "for_sale" && forSaleCheckbox.checked) {
            anonymousCheckbox.checked = false;
        }

        updateDetailsVisibility();
    }

    function fillFormFromButton(button) {
        nameInput.value = button.dataset.name || "";
        descriptionInput.value = button.dataset.description || "";
        categorySelect.value = button.dataset.category || "unisex";
        articleTypeSelect.value = button.dataset.articleType || "other";
        sizeInput.value = button.dataset.size || "";
        clothingTags = parseTags(button.dataset.tags || "[]");
        renderTags();

        countInput.value = button.dataset.count || "1";
        publishCheckbox.checked = parseBoolean(button.dataset.publish);
        anonymousCheckbox.checked = parseBoolean(button.dataset.anonymous);
        forSaleCheckbox.checked = parseBoolean(button.dataset.forSale);
        if (anonymousCheckbox.checked && forSaleCheckbox.checked) {
            forSaleCheckbox.checked = false;
        }
        priceInput.value = button.dataset.price || "0.00";
        stockInput.value = button.dataset.stock || "1";
        updateDetailsVisibility();

        galleryPhotos = parseGallery(button.dataset.gallery || "[]");
        removedGalleryIds = new Set();
        clearPendingGallery();
        renderGallery();

        status.textContent = "";
    }

    function closeModal() {
        clearPendingGallery();
        clothingEditModal.hidden = true;
    }

    editClothingButtons.forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            activeClothingButton = button;
            fillFormFromButton(button);
            clothingEditModal.hidden = false;
            nameInput.focus();
        });
    });

    tagEditor.addEventListener("click", () => {
        tagInput.focus();
    });

    tagInput.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(tagInput.value);
            return;
        }

        if (event.key === "Backspace" && tagInput.value === "" && clothingTags.length) {
            clothingTags.pop();
            renderTags();
        }
    });

    tagInput.addEventListener("input", () => {
        if (!tagInput.value.includes(",")) {
            return;
        }

        const parts = tagInput.value.split(",");
        const leftover = parts.pop();
        parts.forEach(part => addTag(part));
        tagInput.value = leftover.trimStart();
    });

    tagInput.addEventListener("blur", () => {
        addTag(tagInput.value);
    });

    publishCheckbox.addEventListener("change", updateDetailsVisibility);
    anonymousCheckbox.addEventListener("change", () => {
        syncAnonymousAndForSale("anonymous");
    });
    forSaleCheckbox.addEventListener("change", () => {
        syncAnonymousAndForSale("for_sale");
    });
    priceInput.addEventListener("blur", formatPriceInput);
    priceInput.addEventListener("change", formatPriceInput);
    countInput.addEventListener("input", syncStockLimit);
    countInput.addEventListener("change", syncStockLimit);
    stockInput.addEventListener("input", syncStockLimit);
    stockInput.addEventListener("change", syncStockLimit);

    galleryInput.addEventListener("change", () => {
        const remaining = remainingGallerySlots();
        const selected = [...galleryInput.files];

        if (!selected.length) {
            return;
        }

        if (selected.length > remaining) {
            status.textContent = `You can keep up to ${MAX_GALLERY_PHOTOS} gallery photos.`;
        } else {
            status.textContent = "";
        }

        selected.slice(0, remaining).forEach(file => {
            pendingGalleryKey += 1;
            pendingGalleryFiles.push({
                key: pendingGalleryKey,
                file,
                url: URL.createObjectURL(file),
            });
        });

        galleryInput.value = "";
        renderGallery();
    });

    editClothingForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!activeClothingButton) {
            return;
        }

        addTag(tagInput.value);
        syncTagsValue();
        formatPriceInput();
        syncStockLimit();

        const saveButton = editClothingForm.querySelector(".save-clothing-changes");
        const formData = new FormData(editClothingForm);
        formData.delete("gallery_images");
        pendingGalleryFiles.forEach(photo => {
            formData.append("gallery_images", photo.file, photo.file.name);
        });

        removedGalleryIds.forEach(id => {
            formData.append("remove_gallery_ids", id);
        });

        if (!publishCheckbox.checked) {
            formData.set("publish", "false");
            formData.delete("anonymous");
            formData.delete("for_sale");
        } else {
            formData.set("publish", "true");
            formData.set("anonymous", anonymousCheckbox.checked ? "true" : "false");
            formData.set("for_sale", forSaleCheckbox.checked ? "true" : "false");
        }

        saveButton.disabled = true;
        status.textContent = "Saving changes... ♡";

        try {
            const response = await fetch(activeClothingButton.dataset.updateUrl, {
                method: "POST",
                body: formData,
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || "Could not update clothing.");
            }

            status.textContent = "Changes saved successfully! ♡";
            window.location.reload();
        } catch (error) {
            status.textContent = error.message;
        } finally {
            saveButton.disabled = false;
        }
    });

    deleteClothingButton.addEventListener("click", async () => {
        if (!activeClothingButton) {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to permanently delete this clothing item? This cannot be undone.",
        );
        if (!confirmed) {
            return;
        }

        const csrfToken = editClothingForm.querySelector("[name=csrfmiddlewaretoken]").value;
        deleteClothingButton.disabled = true;
        status.textContent = "Deleting clothing...";

        try {
            const response = await fetch(activeClothingButton.dataset.deleteUrl, {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrfToken,
                },
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || "Could not delete clothing.");
            }

            window.location.reload();
        } catch (error) {
            status.textContent = error.message;
            deleteClothingButton.disabled = false;
        }
    });

    closeClothingModal.addEventListener("click", closeModal);

    clothingEditModal.addEventListener("click", event => {
        if (event.target === clothingEditModal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !clothingEditModal.hidden) {
            closeModal();
        }
    });
});
