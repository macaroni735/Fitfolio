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
});
