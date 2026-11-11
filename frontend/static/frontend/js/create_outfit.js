document.addEventListener('DOMContentLoaded', () => {
    const clothingItems = document.querySelectorAll('.clothing-item');
    const clothingTransforms = {};
    const categoryButtons = document.querySelectorAll('.category');
    const mannequinStage = document.getElementById('mannequin-stage');
    const clothingLayer = document.getElementById('mannequin-clothing-layer');
    const mannequinHint = document.querySelector('.mannequin-hint');

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

    saveButton.addEventListener('click', async () => {
        const name = document.getElementById('outfit-name').value.trim();
        const description = document.getElementById('outfit-description').value.trim();
        const publish = document.getElementById('outfit-publish').checked;

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

        const transformsPayload = {};
        selectedItems.forEach(item => {
            transformsPayload[item.dataset.itemId] = {
                ...getActiveTransform(item),
            };
        });

        saveButton.disabled = true;
        saveStatus.textContent = 'Saving your outfit... ♡';

        try {
            const response = await fetch('/outfits/save/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.cookie
                        .split('; ')
                        .find(row => row.startsWith('csrftoken='))
                        ?.split('=')[1] || '',
                },
                body: JSON.stringify({
                    name,
                    description,
                    clothing_ids: clothingIds,
                    clothing_transforms: transformsPayload,
                    publish,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Could not save outfit.');
            }

            saveStatus.textContent = 'Outfit saved successfully! ♡';
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

            document.getElementById('outfit-name').value =
                card.querySelector('.saved-outfit-info h4')?.textContent.trim() || '';
        });
    });
});
