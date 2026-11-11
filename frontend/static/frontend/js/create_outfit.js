document.addEventListener('DOMContentLoaded', () => {
    const clothingItems = document.querySelectorAll('.clothing-item');
    const clothingTransforms = {};
    const categoryButtons = document.querySelectorAll('.category');
    const mannequinStage = document.getElementById('mannequin-stage');
    const clothingLayer = document.getElementById('mannequin-clothing-layer');
    const mannequinHint = document.querySelector('.mannequin-hint');
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

        const orderedItems = Array.from(selectedItems).sort((left, right) => {
            const leftCategory = (left.dataset.category || 'other').toLowerCase();
            const rightCategory = (right.dataset.category || 'other').toLowerCase();
            return (categoryOrder[leftCategory] || 7) - (categoryOrder[rightCategory] || 7);
        });

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
            } else {
                clothingTransforms[item.dataset.itemId] = readItemTransform(item);
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
        const selectedItems = document.querySelectorAll('.clothing-item.selected');
        clothingLayer.replaceChildren();

        selectedItems.forEach(item => {
            const image = item.querySelector('img');
            if (!image) {
                return;
            }

            const category = (item.dataset.category || 'other').toLowerCase();
            const transform = getActiveTransform(item);

            const slot = document.createElement('div');
            slot.className = 'mannequin-item-slot outfit-clothing-slot';
            slot.dataset.itemId = item.dataset.itemId;
            slot.style.zIndex = String(categoryOrder[category] || 7);

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

        const selectedItems = Array.from(
            document.querySelectorAll('.clothing-item.selected')
        );
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
            const payload = {
                name,
                description,
                clothing_ids: clothingIds,
                clothing_transforms: transformsPayload,
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

            placements.forEach(placement => {
                const id = placement.dataset.clothingId;
                const item = Array.from(clothingItems).find(
                    clothing => clothing.dataset.itemId === id
                );

                if (!item) {
                    return;
                }

                item.classList.add('selected');
                item.setAttribute('aria-pressed', 'true');
                clothingTransforms[id] = parseTransform({
                    x: placement.dataset.x,
                    y: placement.dataset.y,
                    rotation: placement.dataset.rotation,
                    scale: placement.dataset.scale,
                });
            });

            updatePreview();
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            editingOutfitId = card.dataset.outfitId || null;
            document.getElementById('outfit-name').value =
                card.querySelector('.saved-outfit-info h4')?.textContent.trim() || '';
            document.getElementById('outfit-description').value =
                card.dataset.description || '';
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
