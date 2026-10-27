
document.addEventListener('DOMContentLoaded', () => {
    const temperatureElement = document.getElementById('weather-temperature');
    const descriptionElement = document.getElementById('weather-description');
    const iconElement = document.getElementById('weather-icon');

    function getWeatherDescription(code) {
        if (code === 0) return ['Clear skies', '☀️'];
        if ([1, 2].includes(code)) return ['Partly cloudy', '🌤️'];
        if (code === 3) return ['Cloudy', '☁️'];
        if ([45, 48].includes(code)) return ['Foggy', '🌫️'];
        if ([51, 53, 55, 56, 57].includes(code)) return ['Drizzly', '🌦️'];
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['Rainy', '🌧️'];
        if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Snowy', '❄️'];
        if ([95, 96, 99].includes(code)) return ['Thunderstorms', '⛈️'];
        return ['Weather unavailable', '🌤️'];
    }

    async function loadWeather(latitude, longitude) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Weather request failed');
            }

            const data = await response.json();
            const temperature = Math.round(data.current.temperature_2m);
            const [description, icon] = getWeatherDescription(data.current.weather_code);

            temperatureElement.textContent = `${temperature}°F`;
            descriptionElement.textContent = description;
            iconElement.textContent = icon;

const wardrobeElement = document.getElementById('wardrobe-data');

if (wardrobeElement) {
    const wardrobe = JSON.parse(wardrobeElement.textContent);

    let recommendedTypes;

    if (temperature >= 80) {
        recommendedTypes = ['t-shirt', 'shirt', 'shorts', 'skirt', 'dress', 'tank top'];
    } else if (temperature >= 65) {
        recommendedTypes = ['shirt', 't-shirt', 'jeans', 'pants', 'dress', 'skirt'];
    } else if (temperature >= 50) {
        recommendedTypes = ['sweater', 'hoodie', 'jeans', 'pants', 'jacket'];
    } else {
        recommendedTypes = ['coat', 'jacket', 'sweater', 'hoodie', 'pants', 'jeans'];
    }

    const recommendedClothing = wardrobe.filter(item => {
        const type = (item.article_type || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const name = (item.name || '').toLowerCase();

        return recommendedTypes.some(keyword =>
            type.includes(keyword) ||
            category.includes(keyword) ||
            name.includes(keyword)
        );
    });

    const outfitCard = document.querySelector('.outfit-card');

    if (outfitCard) {
        const outfitMessage = outfitCard.querySelector('p');

        if (outfitMessage) {
            if (recommendedClothing.length > 0) {
                const suggestions = recommendedClothing.slice(0, 3);

                outfitMessage.textContent =
                    `Perfect for ${temperature}°F: ` +
                    suggestions.map(item => item.name).join(', ') +
                    ' ♡';
            } else if (wardrobe.length === 0) {
                outfitMessage.textContent =
                    'Add some clothing to your wardrobe to get outfit recommendations! ♡';
            } else {
                outfitMessage.textContent =
                    'No weather-matching pieces found. Try adding more clothing! ♡';
            }
        }
    }
}


        } catch (error) {
            descriptionElement.textContent = 'Weather unavailable right now';
        }
    }

    if (!navigator.geolocation) {
        descriptionElement.textContent = 'Location is not supported by your browser';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            loadWeather(
                position.coords.latitude,
                position.coords.longitude
            );
        },
        () => {
            descriptionElement.textContent = 'Enable location access to see your weather';
        },
        {
            timeout: 10000,
            maximumAge: 600000
        }
    );
});
