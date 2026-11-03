
document.addEventListener('DOMContentLoaded', () => {
    const clothingItems = document.querySelectorAll('.clothing-item');
    const clothingPositions = {};
    const previewArea = document.getElementById('outfit-preview');
    const placeholder = document.getElementById('preview-placeholder');
    const categoryButtons = document.querySelectorAll('.category');
    const editClothingButtons = document.querySelectorAll('.edit-clothing-btn');
const clothingEditModal = document.getElementById('clothing-edit-modal');
const closeClothingModal = document.getElementById('close-clothing-modal');
const editClothingForm = document.getElementById('edit-clothing-form');

let activeClothingButton = null;

editClothingButtons.forEach(button => {
    button.addEventListener('click', event => {
        event.stopPropagation();
        activeClothingButton = button;

        document.getElementById('edit-clothing-name').value = button.dataset.name || '';
        document.getElementById('edit-clothing-description').value = button.dataset.description || '';
        document.getElementById('edit-clothing-category').value = button.dataset.category || 'unisex';
        document.getElementById('edit-clothing-article-type').value = button.dataset.articleType || 'other';
        document.getElementById('edit-clothing-size').value = button.dataset.size || '';

        document.getElementById('edit-clothing-status').textContent = '';

        clothingEditModal.hidden = false;
        document.getElementById('edit-clothing-name').focus();
    });
});
editClothingForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!activeClothingButton) return;

    const status = document.getElementById('edit-clothing-status');
    const saveButton = editClothingForm.querySelector('.save-clothing-changes');
    const formData = new FormData(editClothingForm);

    saveButton.disabled = true;
    status.textContent = 'Saving changes... ♡';

    try {
        const response = await fetch(activeClothingButton.dataset.updateUrl, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Could not update clothing.');
        }

        status.textContent = 'Changes saved successfully! ♡';
        window.location.reload();

    } catch (error) {
        status.textContent = error.message;
    } finally {
        saveButton.disabled = false;
    }
});
const deleteClothingButton = document.getElementById('delete-clothing-action');

deleteClothingButton.addEventListener('click', async () => {
    if (!activeClothingButton) return;

    const confirmed = window.confirm(
        'Are you sure you want to permanently delete this clothing item? This cannot be undone.'
    );

    if (!confirmed) return;

    const status = document.getElementById('edit-clothing-status');
    const csrfToken = editClothingForm.querySelector('[name=csrfmiddlewaretoken]').value;

    deleteClothingButton.disabled = true;
    status.textContent = 'Deleting clothing...';

    try {
        const response = await fetch(activeClothingButton.dataset.deleteUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Could not delete clothing.');
        }

        window.location.reload();

    } catch (error) {
        status.textContent = error.message;
        deleteClothingButton.disabled = false;
    }
});
closeClothingModal.addEventListener('click', () => {
    clothingEditModal.hidden = true;
});

clothingEditModal.addEventListener('click', event => {
    if (event.target === clothingEditModal) {
        clothingEditModal.hidden = true;
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !clothingEditModal.hidden) {
        clothingEditModal.hidden = true;
    }
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

    const shouldHide = selectedCategory !== 'all' &&
                       itemCategory !== selectedCategory;

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

            updatePreview();
        });
    });

    
function updatePreview() {
    const selectedItems = document.querySelectorAll('.clothing-item.selected');
    const clothingLayer = document.getElementById('mannequin-clothing-layer');
    const mannequinHint = document.querySelector('.mannequin-hint');

    clothingLayer.innerHTML = '';

    
    const categoryPositions = {
        tops: { top: '22%', left: '50%', width: '42%', height: '30%' },
        bottoms: { top: '46%', left: '50%', width: '42%', height: '39%' },
        dresses: { top: '22%', left: '50%', width: '58%', height: '60%' },
        outerwear: { top: '21%', left: '50%', width: '55%', height: '36%' },
        shoes: { top: '84%', left: '50%', width: '52%', height: '12%' },
        accessories: { top: '10%', left: '50%', width: '35%', height: '18%' },
        other: { top: '32%', left: '50%', width: '40%', height: '30%' }
    };


    const categoryOrder = {
        bottoms: 1,
        shoes: 2,
        dresses: 3,
        tops: 4,
        outerwear: 5,
        accessories: 6,
        other: 7
    };

    selectedItems.forEach(item => {
        const image = item.querySelector('img');
        if (!image) return;

        const category = item.dataset.category || 'other';
        const position = categoryPositions[category] || categoryPositions.other;

        const clothingImage = document.createElement('img');

        clothingImage.src = image.src;
        clothingImage.alt = image.alt;
        clothingImage.className = 'mannequin-clothing';
        clothingImage.dataset.itemId = item.dataset.itemId;

        const savedPosition = clothingPositions[item.dataset.itemId];

clothingImage.style.top = savedPosition ? savedPosition.top : position.top;
clothingImage.style.left = savedPosition ? savedPosition.left : position.left;
        clothingImage.style.width = position.width;
        clothingImage.style.height = position.height;
        clothingImage.style.zIndex = categoryOrder[category] || 7;

        clothingLayer.appendChild(clothingImage);


clothingImage.draggable = false;

clothingImage.addEventListener('pointerdown', event => {
    event.preventDefault();

    const stage = document.getElementById('mannequin-stage');
    const stageRect = stage.getBoundingClientRect();
    const imageRect = clothingImage.getBoundingClientRect();

    const startX = event.clientX;
    const startY = event.clientY;

    const originalLeft = imageRect.left + imageRect.width / 2 - stageRect.left;
    const originalTop = imageRect.top - stageRect.top;

    clothingImage.setPointerCapture(event.pointerId);

    const moveClothing = moveEvent => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const newLeft = Math.max(
            imageRect.width / 2,
            Math.min(stageRect.width - imageRect.width / 2, originalLeft + deltaX)
        );

        const newTop = Math.max(
            0,
            Math.min(stageRect.height - imageRect.height, originalTop + deltaY)
        );

        clothingImage.style.left = `${newLeft}px`;
        clothingImage.style.top = `${newTop}px`;
        clothingPositions[clothingImage.dataset.itemId] = {
    left: `${newLeft}px`,
    top: `${newTop}px`
};
    };

    const stopDragging = () => {
        clothingImage.removeEventListener('pointermove', moveClothing);
        clothingImage.removeEventListener('pointerup', stopDragging);
        clothingImage.removeEventListener('pointercancel', stopDragging);
    };

    clothingImage.addEventListener('pointermove', moveClothing);
    clothingImage.addEventListener('pointerup', stopDragging);
    clothingImage.addEventListener('pointercancel', stopDragging);
});


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

        const clothingIds = Array.from(
            document.querySelectorAll('.clothing-item.selected')
        ).map(item => item.dataset.itemId);

        if (!name) {
            saveStatus.textContent = 'Please name your outfit! ♡';
            return;
        }

        if (clothingIds.length === 0) {
            saveStatus.textContent = 'Select at least one clothing item!';
            return;
        }

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
                        ?.split('=')[1] || ''
                },
                body: JSON.stringify({
                    name: name,
                    description: description,
                    clothing_ids: clothingIds,
                    publish: publish
                })
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
                            ?.split('=')[1] || ''
                    }
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

});


