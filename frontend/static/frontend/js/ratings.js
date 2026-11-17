
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('rating-modal');
    const form = document.getElementById('outfit-rating-form');
    const closeButton = document.getElementById('rating-modal-close');
    const cancelButton = document.getElementById('rating-cancel-btn');
    const submitButton = document.getElementById('rating-submit-btn');
    const outfitName = document.getElementById('rating-outfit-name');
    const selectedLabel = document.getElementById('rating-selected-label');
    const errorMessage = document.getElementById('rating-error');
    const stars = document.querySelectorAll('.rating-star');

    if (!modal || !form) return;

    let selectedRating = 0;
    let currentRatingUrl = '';
    let currentButton = null;
    let isSubmitting = false;

    const ratingLabels = [
        'Select your rating',
        'Not my style',
        'Could be better',
        'It is okay',
        'Really like it!',
        'Absolutely love it!'
    ];

    function updateStars() {
        stars.forEach(star => {
            const value = Number(star.dataset.value);
            const active = value <= selectedRating;

            star.classList.toggle('active', active);
            star.setAttribute('aria-pressed', String(value === selectedRating));

            const icon = star.querySelector('i');
            icon.classList.toggle('fa-solid', active);
            icon.classList.toggle('fa-regular', !active);
        });

        selectedLabel.textContent = ratingLabels[selectedRating];
        submitButton.disabled = selectedRating === 0 || isSubmitting;
    }

    function closeModal() {
        if (isSubmitting) return;

        modal.hidden = true;
        document.body.style.overflow = '';

        if (currentButton) currentButton.focus();
    }

    document.querySelectorAll('.open-rating-btn').forEach(button => {
        button.addEventListener('click', () => {
            currentButton = button;
            currentRatingUrl = button.dataset.ratingUrl;

            form.reset();
            selectedRating = 0;
            errorMessage.hidden = true;
            outfitName.textContent = button.dataset.outfitName;

            updateStars();

            modal.hidden = false;
            document.body.style.overflow = 'hidden';
            closeButton.focus();
        });
    });

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = Number(star.dataset.value);
            updateStars();
        });
    });

    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);

    modal.querySelector('.rating-modal-backdrop')
        .addEventListener('click', closeModal);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) {
            closeModal();
        }
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();

        if (selectedRating === 0 || isSubmitting) return;

        isSubmitting = true;
        errorMessage.hidden = true;
        updateStars();

        const formData = new FormData(form);
        formData.append('rating', selectedRating);

        submitButton.textContent = 'Saving...';

        try {
            const response = await fetch(currentRatingUrl, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Unable to save rating.');
            }

            currentButton.innerHTML = `
                <i class="fa-solid fa-star"></i>
                Your rating: ${data.rating}/5
            `;

            currentButton.dataset.userRating = data.rating;

            closeModalAfterSave();
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.hidden = false;
        } finally {
            isSubmitting = false;
            submitButton.innerHTML = `
                <i class="fa-solid fa-star"></i>
                Submit Rating
            `;
            updateStars();
        }
    });

    function closeModalAfterSave() {
        modal.hidden = true;
        document.body.style.overflow = '';

        if (currentButton) currentButton.focus();
    }
});

