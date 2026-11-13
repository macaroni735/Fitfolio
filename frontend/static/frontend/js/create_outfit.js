document.addEventListener('DOMContentLoaded', () => {
    const clothingItems = document.querySelectorAll('.clothing-item');
    const clothingById = new Map(
        Array.from(clothingItems).map(item => [item.dataset.itemId, item])
    );
    const clothingTransforms = {};
    const layerOrder = [];
    const categoryButtons = document.querySelectorAll('.category');
    const mannequinStage = document.getElementById('mannequin-stage');
    const clothingLayer = document.getElementById('mannequin-clothing-layer');
    const mannequinHint = document.querySelector('.mannequin-hint');
    const layersList = document.getElementById('layers-list');
    const layersEmpty = document.getElementById('layers-empty');
    const wardrobeTabButtons = document.querySelectorAll('[data-wardrobe-tab]');
    const wardrobeTabPanel = document.getElementById('wardrobe-tab-panel');
    const layersTabPanel = document.getElementById('layers-tab-panel');
    let editingOutfitId = null;

    const DEFAULT_TRANSFORM = {
        x: 0.5,
        y: 0.5,
        rotation: 0,
        scale: 1,
    };
    const MANNEQUIN_SLOT_WIDTH = 0.7;
    const MANNEQUIN_SLOT_HEIGHT = 0.9;

    const categoryOrder = {
        bottoms: 1,
        shoes: 2,
        dresses: 3,
        tops: 4,
        outerwear: 5,
        accessories: 6,
        other: 7,
    };

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function roundTransform(value) {
        return Math.round(value * 10000) / 10000;
    }

    function parseTransform(source) {
        const transform = { ...DEFAULT_TRANSFORM };

        if (!source) {
            return transform;
        }

        const read = (key, fallback) => {
            const value = Number(source[key]);
            return Number.isFinite(value) ? value : fallback;
        };

        transform.x = read('x', transform.x);
        transform.y = read('y', transform.y);
        transform.rotation = read('rotation', transform.rotation);
        transform.scale = read('scale', transform.scale);
        return transform;
    }

    function readItemTransform(item) {
        return parseTransform({
            x: item.dataset.transformX,
            y: item.dataset.transformY,
            rotation: item.dataset.transformRotation,
            scale: item.dataset.transformScale,
        });
    }

    function applySlotTransform(slot, transform) {
        const shiftX = ((transform.x - 0.5) / MANNEQUIN_SLOT_WIDTH) * 100;
        const shiftY = ((transform.y - 0.5) / MANNEQUIN_SLOT_HEIGHT) * 100;
        slot.style.transform =
            `translate(${shiftX}%, ${shiftY}%) rotate(${transform.rotation}deg) scale(${transform.scale})`;
    }

    function loadImageFromUrl(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Could not load image.'));
            image.src = src;
        });
    }

    function drawContainedImage(ctx, image, x, y, width, height) {
        const imageRatio = image.naturalWidth / image.naturalHeight;
        const boxRatio = width / height;
        let drawWidth = width;
        let drawHeight = height;
        let drawX = x;
        let drawY = y;

        if (imageRatio > boxRatio) {
            drawHeight = width / imageRatio;
            drawY = y + (height - drawHeight) / 2;
        } else {
            drawWidth = height * imageRatio;
            drawX = x + (width - drawWidth) / 2;
        }

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    function canvasToBlob(sourceCanvas, type, quality) {
        return new Promise((resolve, reject) => {
            sourceCanvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                    return;
                }
                reject(new Error('Could not create outfit thumbnail.'));
            }, type, quality);
        });
    }

    async function captureOutfitThumbnail(selectedItems) {
        const width = 600;
        const height = 800;
        const slotWidth = MANNEQUIN_SLOT_WIDTH * width;
        const slotHeight = MANNEQUIN_SLOT_HEIGHT * height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#FFFCFA');
        gradient.addColorStop(1, '#FCECF5');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        const guideElement = document.querySelector('.mannequin-guide');
        if (guideElement?.src) {
            try {
                const guideImage = await loadImageFromUrl(guideElement.src);
                ctx.globalAlpha = 0.35;
                drawContainedImage(
                    ctx,
                    guideImage,
                    (1 - MANNEQUIN_SLOT_WIDTH) / 2 * width,
                    0.05 * height,
                    slotWidth,
                    slotHeight,
                );
                ctx.globalAlpha = 1;
            } catch {
                // Guide is decorative; continue without it.
            }
        }

        const orderedItems = getSelectedItemsInLayerOrder().slice().reverse();

        for (const item of orderedItems) {
            const previewImage = item.querySelector('img');
            if (!previewImage?.src) {
                continue;
            }

            let clothingImage;
            try {
                clothingImage = await loadImageFromUrl(previewImage.src);
            } catch {
                continue;
            }

            const transform = getActiveTransform(item);
            ctx.save();
            ctx.translate(transform.x * width, transform.y * height);
            ctx.rotate((transform.rotation * Math.PI) / 180);
            ctx.scale(transform.scale, transform.scale);
            drawContainedImage(
                ctx,
                clothingImage,
                -slotWidth / 2,
                -slotHeight / 2,
                slotWidth,
                slotHeight,
            );
            ctx.restore();
        }

        try {
            return await canvasToBlob(canvas, 'image/png');
        } catch {
            return canvasToBlob(canvas, 'image/jpeg', 0.92);
        }
    }

    function getActiveTransform(item) {
        const id = item.dataset.itemId;
        if (!clothingTransforms[id]) {
            clothingTransforms[id] = readItemTransform(item);
        }
        return clothingTransforms[id];
    }

    function categoryScore(item) {
        const category = (item?.dataset.category || 'other').toLowerCase();
        return categoryOrder[category] || 7;
    }

    function defaultLayerInsertIndex(item) {
        const score = categoryScore(item);
        for (let index = 0; index < layerOrder.length; index += 1) {
            const other = clothingById.get(layerOrder[index]);
            if (score >= categoryScore(other)) {
                return index;
            }
        }
        return layerOrder.length;
    }

    function addToLayerOrder(itemId) {
        if (!itemId || layerOrder.includes(itemId)) {
            return;
        }

        const item = clothingById.get(itemId);
        const insertAt = item ? defaultLayerInsertIndex(item) : 0;
        layerOrder.splice(insertAt, 0, itemId);
    }

    function removeFromLayerOrder(itemId) {
        const index = layerOrder.indexOf(itemId);
        if (index >= 0) {
            layerOrder.splice(index, 1);
        }
    }

    function applyMannequinLayerOrder() {
        const selectedItems = getSelectedItemsInLayerOrder();
        selectedItems.forEach((item, index) => {
            const slot = clothingLayer.querySelector(
                `.outfit-clothing-slot[data-item-id="${item.dataset.itemId}"]`
            );
            if (slot) {
                slot.style.zIndex = String(selectedItems.length - index);
            }
        });
    }

    function getDragAfterElement(y) {
        const rows = Array.from(layersList.querySelectorAll('.layer-row'));

        return rows.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    function bindLayerDrag(row) {
        let dragging = false;
        let activePointerId = null;
        let offsetY = 0;
        let placeholder = null;

        const clearFloatingStyles = () => {
            row.style.position = '';
            row.style.left = '';
            row.style.top = '';
            row.style.width = '';
            row.style.zIndex = '';
            row.style.pointerEvents = '';
        };

        const syncOrderFromPlaceholder = () => {
            if (!placeholder) {
                return;
            }

            const nextOrder = [];
            Array.from(layersList.children).forEach(child => {
                if (child === placeholder) {
                    nextOrder.push(row.dataset.itemId);
                    return;
                }
                if (child.classList?.contains('layer-row') && child.dataset.itemId) {
                    nextOrder.push(child.dataset.itemId);
                }
            });
            layerOrder.splice(0, layerOrder.length, ...nextOrder);
            applyMannequinLayerOrder();
        };

        const stopDragging = event => {
            if (!dragging) {
                return;
            }

            if (
                event
                && activePointerId !== null
                && event.pointerId !== activePointerId
            ) {
                return;
            }

            dragging = false;
            const pointerId = activePointerId;
            activePointerId = null;
            row.classList.remove('is-dragging');
            layersList.classList.remove('is-reordering');

            if (
                pointerId !== null
                && row.hasPointerCapture?.(pointerId)
            ) {
                row.releasePointerCapture(pointerId);
            }

            if (placeholder?.parentNode) {
                placeholder.replaceWith(row);
            } else if (!row.isConnected) {
                layersList.append(row);
            }

            placeholder = null;
            clearFloatingStyles();

            const nextOrder = Array.from(layersList.querySelectorAll('.layer-row'))
                .map(entry => entry.dataset.itemId)
                .filter(Boolean);
            layerOrder.splice(0, layerOrder.length, ...nextOrder);
            updatePreview();
        };

        row.addEventListener('pointerdown', event => {
            if (event.button || dragging) {
                return;
            }

            if (event.target.closest('.layer-remove')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const rect = row.getBoundingClientRect();
            offsetY = event.clientY - rect.top;
            activePointerId = event.pointerId;
            dragging = true;

            placeholder = document.createElement('div');
            placeholder.className = 'layer-row-placeholder';
            placeholder.style.height = `${rect.height}px`;
            row.after(placeholder);

            row.classList.add('is-dragging');
            layersList.classList.add('is-reordering');
            row.style.position = 'fixed';
            row.style.left = `${rect.left}px`;
            row.style.top = `${rect.top}px`;
            row.style.width = `${rect.width}px`;
            row.style.zIndex = '1000';
            row.style.pointerEvents = 'none';
            document.body.append(row);

            row.setPointerCapture(event.pointerId);
            syncOrderFromPlaceholder();
        });

        row.addEventListener('pointermove', event => {
            if (!dragging || event.pointerId !== activePointerId || !placeholder) {
                return;
            }

            row.style.top = `${event.clientY - offsetY}px`;

            const afterElement = getDragAfterElement(event.clientY);
            if (afterElement) {
                layersList.insertBefore(placeholder, afterElement);
            } else {
                layersList.append(placeholder);
            }

            syncOrderFromPlaceholder();
        });

        row.addEventListener('pointerup', stopDragging);
        row.addEventListener('pointercancel', stopDragging);
        row.addEventListener('lostpointercapture', stopDragging);
    }

    function getSelectedItemsInLayerOrder() {
        return layerOrder
            .map(itemId => clothingById.get(itemId))
            .filter(item => item?.classList.contains('selected'));
    }

    function setWardrobeTab(tabName) {
        const showLayers = tabName === 'layers';
        wardrobeTabButtons.forEach(button => {
            const isActive = button.dataset.wardrobeTab === tabName;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
        wardrobeTabPanel.hidden = showLayers;
        layersTabPanel.hidden = !showLayers;
    }

    function updateLayersPanel() {
        if (!layersList || !layersEmpty) {
            return;
        }

        const selectedItems = getSelectedItemsInLayerOrder();
        layersEmpty.hidden = selectedItems.length > 0;
        layersList.replaceChildren();

        selectedItems.forEach((item, index) => {
            const image = item.querySelector('img');
            const name = item.querySelector('p')?.textContent.trim()
                || image?.alt
                || 'Clothing item';

            const row = document.createElement('div');
            row.className = 'layer-row';
            row.dataset.itemId = item.dataset.itemId;

            const handle = document.createElement('div');
            handle.className = 'layer-drag-handle';
            handle.setAttribute('role', 'button');
            handle.setAttribute('tabindex', '0');
            handle.setAttribute('aria-label', `Drag to reorder ${name}`);
            handle.innerHTML = '<i class="fa-solid fa-grip-lines" aria-hidden="true"></i>';

            const preview = document.createElement('div');
            preview.className = 'layer-preview';
            if (image) {
                const thumb = document.createElement('img');
                thumb.src = image.src;
                thumb.alt = name;
                preview.append(thumb);
            } else {
                preview.textContent = '👚';
            }

            const details = document.createElement('div');
            details.className = 'layer-details';
            const title = document.createElement('p');
            title.className = 'layer-name';
            title.textContent = name;
            const meta = document.createElement('span');
            meta.className = 'layer-meta';
            meta.textContent = index === 0 ? 'Front' : (
                index === selectedItems.length - 1 ? 'Back' : `Layer ${index + 1}`
            );
            details.append(title, meta);

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'layer-remove';
            removeButton.setAttribute('aria-label', `Remove ${name} from outfit`);
            removeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
            removeButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                item.classList.remove('selected');
                item.setAttribute('aria-pressed', 'false');
                delete clothingTransforms[item.dataset.itemId];
                removeFromLayerOrder(item.dataset.itemId);
                updatePreview();
            });

            row.append(handle, preview, details, removeButton);
            layersList.append(row);
            bindLayerDrag(row);
        });
    }

    wardrobeTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            setWardrobeTab(button.dataset.wardrobeTab);
        });
    });

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedCategory = button.dataset.filter;

            categoryButtons.forEach(categoryButton => {
                categoryButton.classList.toggle(
                    'active',
                    categoryButton === button
                );
            });

            clothingItems.forEach(item => {
                const itemCategory = (item.dataset.category || '').trim().toLowerCase();
                const clothingCard = item.closest('.clothing-card');
                const shouldHide =
                    selectedCategory !== 'all' && itemCategory !== selectedCategory;

                if (clothingCard) {
                    clothingCard.hidden = shouldHide;
                }
            });
        });
    });

    clothingItems.forEach(item => {
        item.setAttribute('aria-pressed', 'false');

        item.addEventListener('click', () => {
            const isSelected = item.classList.toggle('selected');
            item.setAttribute('aria-pressed', String(isSelected));

            if (!isSelected) {
                delete clothingTransforms[item.dataset.itemId];
                removeFromLayerOrder(item.dataset.itemId);
            } else {
                clothingTransforms[item.dataset.itemId] = readItemTransform(item);
                addToLayerOrder(item.dataset.itemId);
            }

            updatePreview();
        });
    });

    function bindSlotDrag(slot, itemId) {
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        slot.addEventListener('pointerdown', event => {
            if (event.button) {
                return;
            }

            event.preventDefault();
            const transform = clothingTransforms[itemId];
            if (!transform) {
                return;
            }

            const frameRect = mannequinStage.getBoundingClientRect();
            slot.setPointerCapture(event.pointerId);
            isDragging = true;
            dragOffsetX =
                event.clientX - (frameRect.left + transform.x * frameRect.width);
            dragOffsetY =
                event.clientY - (frameRect.top + transform.y * frameRect.height);
        });

        slot.addEventListener('pointermove', event => {
            if (!isDragging) {
                return;
            }

            const transform = clothingTransforms[itemId];
            if (!transform) {
                return;
            }

            const frameRect = mannequinStage.getBoundingClientRect();
            transform.x = roundTransform(clamp(
                (event.clientX - dragOffsetX - frameRect.left) / frameRect.width,
                -0.25,
                1.25,
            ));
            transform.y = roundTransform(clamp(
                (event.clientY - dragOffsetY - frameRect.top) / frameRect.height,
                -0.25,
                1.25,
            ));
            applySlotTransform(slot, transform);
        });

        const stopDragging = () => {
            isDragging = false;
        };

        slot.addEventListener('pointerup', stopDragging);
        slot.addEventListener('pointercancel', stopDragging);
    }

    function updatePreview() {
        const selectedItems = getSelectedItemsInLayerOrder();
        clothingLayer.replaceChildren();

        selectedItems.forEach((item, index) => {
            const image = item.querySelector('img');
            if (!image) {
                return;
            }

            const transform = getActiveTransform(item);
            const slot = document.createElement('div');
            slot.className = 'mannequin-item-slot outfit-clothing-slot';
            slot.dataset.itemId = item.dataset.itemId;
            slot.style.zIndex = String(selectedItems.length - index);

            const clothingImage = document.createElement('img');
            clothingImage.src = image.src;
            clothingImage.alt = image.alt;
            clothingImage.className = 'placed-clothing';
            clothingImage.draggable = false;

            slot.append(clothingImage);
            clothingLayer.append(slot);
            applySlotTransform(slot, transform);
            bindSlotDrag(slot, item.dataset.itemId);
        });

        mannequinHint.textContent = selectedItems.length
            ? 'Your outfit is coming together! ♡'
            : 'Choose clothing from your wardrobe to style your mannequin ♡';
        updateLayersPanel();
    }

    const saveButton = document.getElementById('save-outfit');
    const saveStatus = document.getElementById('save-outfit-status');
    const publishCheckbox = document.getElementById('outfit-publish');
    const anonymousCheckbox = document.getElementById('outfit-anonymous');
    const forSaleCheckbox = document.getElementById('outfit-for-sale');
    const publishFields = document.getElementById('outfit-publish-fields');
    const saleFields = document.getElementById('outfit-sale-fields');
    const priceInput = document.getElementById('outfit-price');
    const tagList = document.getElementById('outfit-tag-list');
    const tagInput = document.getElementById('outfit-tags');
    let outfitTags = [];

    function normalizeTag(value) {
        return String(value || '')
            .replaceAll(',', ' ')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    function parseTags(raw) {
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter(tag => typeof tag === 'string')
                    .map(normalizeTag)
                    .filter(Boolean)
                    .filter((tag, index, list) => list.indexOf(tag) === index);
            }
        } catch {
            // Fall through to comma-separated parsing.
        }

        return String(raw)
            .split(',')
            .map(normalizeTag)
            .filter(Boolean)
            .filter((tag, index, list) => list.indexOf(tag) === index);
    }

    function renderTags() {
        tagList.replaceChildren(...outfitTags.map((tag, index) => {
            const chip = document.createElement('span');
            chip.className = 'outfit-tag-chip';

            const label = document.createElement('span');
            label.textContent = tag;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'outfit-tag-remove';
            removeButton.setAttribute('aria-label', `Remove ${tag}`);
            removeButton.textContent = '×';
            removeButton.addEventListener('click', () => {
                outfitTags.splice(index, 1);
                renderTags();
                tagInput.focus();
            });

            chip.append(label, removeButton);
            return chip;
        }));

        tagInput.placeholder = outfitTags.length
            ? ''
            : 'Type a tag, then Enter';
    }

    function addTag(rawValue) {
        const tag = normalizeTag(rawValue);
        if (!tag || outfitTags.includes(tag)) {
            tagInput.value = '';
            return;
        }

        outfitTags.push(tag);
        tagInput.value = '';
        renderTags();
    }

    function formatPriceInput() {
        const parsed = Number.parseFloat(priceInput.value);
        const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        priceInput.value = amount.toFixed(2);
    }

    function updateDetailsVisibility() {
        const published = publishCheckbox.checked;
        const forSale = published && forSaleCheckbox.checked;

        publishFields.hidden = !published;
        saleFields.hidden = !forSale;

        if (forSale) {
            formatPriceInput();
        }
    }

    function syncAnonymousAndForSale(changed) {
        if (changed === 'anonymous' && anonymousCheckbox.checked) {
            forSaleCheckbox.checked = false;
        }

        if (changed === 'for_sale' && forSaleCheckbox.checked) {
            anonymousCheckbox.checked = false;
        }

        updateDetailsVisibility();
    }

    tagInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addTag(tagInput.value);
            return;
        }

        if (event.key === 'Backspace' && tagInput.value === '' && outfitTags.length) {
            outfitTags.pop();
            renderTags();
        }
    });

    tagInput.addEventListener('blur', () => {
        if (tagInput.value.trim()) {
            addTag(tagInput.value);
        }
    });

    publishCheckbox.addEventListener('change', updateDetailsVisibility);
    anonymousCheckbox.addEventListener('change', () => {
        syncAnonymousAndForSale('anonymous');
    });
    forSaleCheckbox.addEventListener('change', () => {
        syncAnonymousAndForSale('for_sale');
    });
    priceInput.addEventListener('blur', formatPriceInput);
    priceInput.addEventListener('change', formatPriceInput);
    renderTags();
    updateDetailsVisibility();

    saveButton.addEventListener('click', async () => {
        const name = document.getElementById('outfit-name').value.trim();
        const description = document.getElementById('outfit-description').value.trim();
        const publish = publishCheckbox.checked;
        const anonymous = publish && anonymousCheckbox.checked;
        const forSale = publish && forSaleCheckbox.checked;

        const selectedItems = getSelectedItemsInLayerOrder();
        const clothingIds = selectedItems.map(item => item.dataset.itemId);

        if (!name) {
            saveStatus.textContent = 'Please name your outfit! ♡';
            return;
        }

        if (clothingIds.length === 0) {
            saveStatus.textContent = 'Select at least one clothing item!';
            return;
        }

        if (anonymous && forSale) {
            saveStatus.textContent = "Anonymous and For Sale can't both be selected.";
            return;
        }

        if (tagInput.value.trim()) {
            addTag(tagInput.value);
        }

        const transformsPayload = {};
        selectedItems.forEach(item => {
            transformsPayload[item.dataset.itemId] = {
                ...getActiveTransform(item),
            };
        });

        saveButton.disabled = true;
        saveStatus.textContent = editingOutfitId
            ? 'Updating your outfit... ♡'
            : 'Saving your outfit... ♡';

        try {
            const category = document.getElementById('outfit-category').value || 'unisex';
            const payload = {
                name,
                description,
                category,
                clothing_ids: clothingIds,
                clothing_transforms: transformsPayload,
                clothing_layer_order: layerOrder.filter(id => clothingIds.includes(id)),
                tags: outfitTags,
                publish,
                anonymous,
                for_sale: forSale,
                price: forSale ? priceInput.value : '',
            };
            if (editingOutfitId) {
                payload.outfit_id = editingOutfitId;
            }

            const formData = new FormData();
            formData.append('data', JSON.stringify(payload));

            try {
                const thumbnailBlob = await captureOutfitThumbnail(selectedItems);
                if (thumbnailBlob) {
                    const extension = thumbnailBlob.type === 'image/jpeg' ? 'jpg' : 'png';
                    formData.append(
                        'thumbnail',
                        thumbnailBlob,
                        `outfit-thumbnail.${extension}`,
                    );
                }
            } catch {
                // Outfit still saves if thumbnail capture fails.
            }

            const response = await fetch('/outfits/save/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.cookie
                        .split('; ')
                        .find(row => row.startsWith('csrftoken='))
                        ?.split('=')[1] || '',
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Could not save outfit.');
            }

            saveStatus.textContent = editingOutfitId
                ? 'Outfit updated successfully! ♡'
                : 'Outfit saved successfully! ♡';
            window.location.reload();
        } catch (error) {
            saveStatus.textContent = error.message;
        } finally {
            saveButton.disabled = false;
        }
    });

    const deleteButtons = document.querySelectorAll('.delete-outfit-btn');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const confirmed = window.confirm(
                'Are you sure you want to delete this outfit? ♡'
            );

            if (!confirmed) {
                return;
            }

            button.disabled = true;
            button.textContent = 'Deleting...';

            try {
                const response = await fetch(button.dataset.deleteUrl, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.cookie
                            .split('; ')
                            .find(row => row.startsWith('csrftoken='))
                            ?.split('=')[1] || '',
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Could not delete outfit.');
                }

                window.location.reload();
            } catch (error) {
                alert(error.message);
                button.disabled = false;
                button.textContent = '🗑️ Delete Outfit';
            }
        });
    });

    const savedOutfitCards = document.querySelectorAll('.saved-outfit-card');

    savedOutfitCards.forEach(card => {
        card.addEventListener('click', event => {
            if (event.target.closest('.delete-outfit-btn')) {
                return;
            }

            const placements = card.querySelectorAll(
                '.saved-outfit-placements [data-clothing-id]'
            );

            if (!placements.length) {
                alert('This outfit has no clothing to display.');
                return;
            }

            clothingItems.forEach(item => {
                item.classList.remove('selected');
                item.setAttribute('aria-pressed', 'false');
            });

            Object.keys(clothingTransforms).forEach(id => {
                delete clothingTransforms[id];
            });
            layerOrder.splice(0, layerOrder.length);

            const loadedPlacements = Array.from(placements)
                .map(placement => ({
                    id: placement.dataset.clothingId,
                    layer: Number(placement.dataset.layer),
                    placement,
                }))
                .filter(entry => clothingById.has(entry.id))
                .sort((left, right) => {
                    const leftLayer = Number.isFinite(left.layer) ? left.layer : 0;
                    const rightLayer = Number.isFinite(right.layer) ? right.layer : 0;
                    if (rightLayer !== leftLayer) {
                        return rightLayer - leftLayer;
                    }
                    return categoryScore(clothingById.get(right.id))
                        - categoryScore(clothingById.get(left.id));
                });

            loadedPlacements.forEach(({ id, placement }) => {
                const item = clothingById.get(id);
                item.classList.add('selected');
                item.setAttribute('aria-pressed', 'true');
                clothingTransforms[id] = parseTransform({
                    x: placement.dataset.x,
                    y: placement.dataset.y,
                    rotation: placement.dataset.rotation,
                    scale: placement.dataset.scale,
                });
                layerOrder.push(id);
            });

            updatePreview();
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            editingOutfitId = card.dataset.outfitId || null;
            document.getElementById('outfit-name').value =
                card.querySelector('.saved-outfit-info h4')?.textContent.trim() || '';
            document.getElementById('outfit-description').value =
                card.dataset.description || '';
            document.getElementById('outfit-category').value =
                card.dataset.category || 'unisex';
            outfitTags = parseTags(card.dataset.tags || '');
            renderTags();
            publishCheckbox.checked =
                String(card.dataset.publish || '').toLowerCase() === 'true';
            anonymousCheckbox.checked =
                String(card.dataset.anonymous || '').toLowerCase() === 'true';
            forSaleCheckbox.checked =
                String(card.dataset.forSale || '').toLowerCase() === 'true';
            if (anonymousCheckbox.checked && forSaleCheckbox.checked) {
                forSaleCheckbox.checked = false;
            }
            priceInput.value = card.dataset.price || '0.00';
            updateDetailsVisibility();
            saveStatus.textContent = 'Editing saved outfit. Save will replace this look. ♡';
        });
    });
});
