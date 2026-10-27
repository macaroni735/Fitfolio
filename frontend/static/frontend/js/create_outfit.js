
document.addEventListener('DOMContentLoaded', () => {
    const clothingItems = document.querySelectorAll('.clothing-item');
    const previewArea = document.getElementById('outfit-preview');
    const placeholder = document.getElementById('preview-placeholder');

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

        previewArea.querySelectorAll('.preview-item').forEach(item => item.remove());

        placeholder.style.display = selectedItems.length === 0 ? '' : 'none';

        selectedItems.forEach(item => {
            const previewItem = document.createElement('div');
            previewItem.classList.add('preview-item');

            const image = item.querySelector('img');
            const name = item.querySelector('p');

            if (image) {
                const previewImage = document.createElement('img');
                previewImage.src = image.src;
                previewImage.alt = image.alt;
                previewItem.appendChild(previewImage);
            } else {
                const emoji = document.createElement('span');
                emoji.textContent = '👚';
                previewItem.appendChild(emoji);
            }

            const previewName = document.createElement('p');
            previewName.textContent = name ? name.textContent : 'Clothing item';
            previewItem.appendChild(previewName);

            previewArea.appendChild(previewItem);
        });
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


