
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
});


