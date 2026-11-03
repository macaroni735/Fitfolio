
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-box input');
    const categoryButtons = document.querySelectorAll('.category-buttons .category');
    const clothingCards = document.querySelectorAll('.wardrobe-grid .clothing-card');

    let activeCategory = 'all';

    function filterClothing() {
        const searchTerm = searchInput.value.trim().toLowerCase();

        clothingCards.forEach(card => {
            const name = card.dataset.name || '';
            const category = card.dataset.category || '';

            const matchesSearch = name.includes(searchTerm);
            const matchesCategory = activeCategory === 'all' || category === activeCategory;

            card.hidden = !(matchesSearch && matchesCategory);
        });
    }

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.filter;

            categoryButtons.forEach(categoryButton => {
                categoryButton.classList.toggle('active', categoryButton === button);
            });

            filterClothing();
        });
    });

    searchInput.addEventListener('input', filterClothing);

    const editClothingButtons = document.querySelectorAll('.edit-clothing-btn');
    const clothingEditModal = document.getElementById('clothing-edit-modal');
    const closeClothingModal = document.getElementById('close-clothing-modal');
    const editClothingForm = document.getElementById('edit-clothing-form');

    let activeClothingButton = null;

    editClothingButtons.forEach(button => {
        button.addEventListener('click', () => {
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
        } finally {
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

});
