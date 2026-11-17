
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('profile-picture-modal');
    const openButton = document.getElementById('edit-profile-picture');
    const closeButton = document.getElementById('picture-modal-close');
    const cancelButton = document.getElementById('picture-cancel-btn');
    const saveButton = document.getElementById('picture-save-btn');
    const fileInput = document.getElementById('picture-file-input');
    const preview = document.getElementById('picture-crop-preview');
    const placeholder = document.getElementById('picture-crop-placeholder');
    const cropArea = document.getElementById('picture-crop-area');
    const cropCircle = cropArea?.querySelector('.picture-crop-circle');
    const zoomInput = document.getElementById('picture-zoom');

    if (!modal || !openButton || !cropCircle) return;

    let image = null;
    let imageURL = null;
    let zoom = 1;
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function cropSize() {
        return cropCircle.clientWidth - 6;
    }

    function baseScale() {
        return Math.max(
            cropSize() / image.naturalWidth,
            cropSize() / image.naturalHeight
        );
    }

    function clampOffsets() {
        if (!image) return;

        const scale = baseScale() * zoom;
        const maxX = Math.max(0, (image.naturalWidth * scale - cropSize()) / 2);
        const maxY = Math.max(0, (image.naturalHeight * scale - cropSize()) / 2);

        offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
        offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
    }

    function updatePreview() {
        if (!image) return;

        clampOffsets();

        const scale = baseScale() * zoom;

        preview.style.width = `${image.naturalWidth * scale}px`;
        preview.style.height = `${image.naturalHeight * scale}px`;
        preview.style.left = `calc(50% + ${offsetX}px)`;
        preview.style.top = `calc(50% + ${offsetY}px)`;
        preview.style.transform = 'translate(-50%, -50%)';
    }

    function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
        openButton.focus();
    }

    openButton.addEventListener('click', () => {
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        closeButton.focus();
    });

    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);

    modal.querySelector('.profile-picture-modal-backdrop')
        .addEventListener('click', closeModal);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Please choose a JPG, PNG, or WebP image.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Please choose an image smaller than 10 MB.');
            return;
        }

        if (imageURL) URL.revokeObjectURL(imageURL);
        imageURL = URL.createObjectURL(file);

        const newImage = new Image();

        newImage.onload = () => {
            image = newImage;
            preview.src = imageURL;
            preview.hidden = false;
            placeholder.hidden = true;

            zoom = 1;
            offsetX = 0;
            offsetY = 0;
            zoomInput.value = '1';

            updatePreview();
            saveButton.disabled = false;
        };

        newImage.onerror = () => {
            alert('This image could not be opened.');
            URL.revokeObjectURL(imageURL);
            imageURL = null;
        };

        newImage.src = imageURL;
    });

    zoomInput.addEventListener('input', () => {
        if (!image) return;
        zoom = Number(zoomInput.value);
        updatePreview();
    });

    cropArea.addEventListener('pointerdown', event => {
        if (!image) return;

        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        cropArea.setPointerCapture(event.pointerId);
    });

    cropArea.addEventListener('pointermove', event => {
        if (!dragging || !image) return;

        offsetX += event.clientX - lastX;
        offsetY += event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;

        updatePreview();
    });

    function stopDragging() {
        dragging = false;
    }

    cropArea.addEventListener('pointerup', stopDragging);
    cropArea.addEventListener('pointercancel', stopDragging);

    saveButton.addEventListener('click', async () => {
        if (!image) return;

        const canvas = document.createElement('canvas');
        const size = 400;
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d');
        const ratio = size / cropSize();
        const scale = baseScale() * zoom * ratio;

        context.beginPath();
        context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        context.clip();

        context.drawImage(
            image,
            size / 2 + offsetX * ratio - image.naturalWidth * scale / 2,
            size / 2 + offsetY * ratio - image.naturalHeight * scale / 2,
            image.naturalWidth * scale,
            image.naturalHeight * scale
        );

        canvas.toBlob(async blob => {
            if (!blob) {
                alert('Unable to crop this picture.');
                return;
            }

            const formData = new FormData();
            formData.append('profile_picture', blob, 'profile-picture.png');
            formData.append('username', document.getElementById('username').value);
            formData.append('email', document.getElementById('email').value);

            const csrfToken = document.querySelector(
                '.profile-form input[name="csrfmiddlewaretoken"]'
            ).value;

            formData.append('csrfmiddlewaretoken', csrfToken);

            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            try {
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });

                if (!response.ok) throw new Error('Upload failed');

                window.location.reload();
            } catch (error) {
                alert('Could not save your profile picture. Please try again.');
                saveButton.disabled = false;
                saveButton.textContent = 'Save Picture';
            }
        }, 'image/png');
    });
});
