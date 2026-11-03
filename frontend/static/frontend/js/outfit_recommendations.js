
document.addEventListener('DOMContentLoaded', () => {
    const wardrobeElement = document.getElementById('wardrobe-data');
    const clothingLayer = document.getElementById('home-mannequin-clothing-layer');
    const recommendationText = document.getElementById('outfit-recommendation');
    const newLookButton = document.getElementById('new-look-button');
    const lookCounter = document.querySelector('.look-counter');
    const lookArrows = document.querySelectorAll('.look-arrow');

    if (!wardrobeElement || !clothingLayer) return;

    const wardrobe = JSON.parse(wardrobeElement.textContent);
    const positions = {
        tops: { top: '22%', left: '50%', width: '42%', height: '30%' },
        bottoms: { top: '46%', left: '50%', width: '42%', height: '39%' },
        dresses: { top: '22%', left: '50%', width: '58%', height: '60%' },
        outerwear: { top: '21%', left: '50%', width: '55%', height: '36%' },
        shoes: { top: '84%', left: '50%', width: '52%', height: '12%' },
        accessories: { top: '10%', left: '50%', width: '35%', height: '18%' }
    };

    const layers = {
        bottoms: 1,
        shoes: 2,
        dresses: 3,
        tops: 4,
        outerwear: 5,
        accessories: 6
    };

    const categories = Object.keys(positions);
    const items = wardrobe.filter(item => item.image && categories.includes(item.article_type));

    const groups = Object.fromEntries(
        categories.map(category => [
            category,
            items.filter(item => item.article_type === category)
        ])
    );

    const pickRandom = group => group[Math.floor(Math.random() * group.length)];

    let lookNumber = 0;
    let currentSignature = '';
    let currentWeather = null;

document.addEventListener('fitfolio:weather-ready', event => {
    currentWeather = event.detail;
    showNewLook();
});

    
function generateLook() {
    const outfit = [];
    const temperature = currentWeather?.temperature;
    const weatherCode = currentWeather?.weatherCode;

    const isCold = temperature !== undefined && temperature < 60;
    const isHot = temperature !== undefined && temperature >= 80;
    const isRainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode);

    const pickWeatherMatch = (group, keywords) => {
        const matches = group.filter(item => {
            const name = item.name.toLowerCase();
            return keywords.some(keyword => name.includes(keyword));
        });

        return pickRandom(matches.length ? matches : group);
    };

    if (
        groups.dresses.length &&
        !isCold &&
        (!groups.tops.length || !groups.bottoms.length || Math.random() < 0.3)
    ) {
        outfit.push(pickRandom(groups.dresses));
    } else {
        if (groups.tops.length) {
            outfit.push(
                isCold
                    ? pickWeatherMatch(groups.tops, ['sweater', 'hoodie', 'long sleeve'])
                    : isHot
                        ? pickWeatherMatch(groups.tops, ['t-shirt', 'tank', 'short sleeve'])
                        : pickRandom(groups.tops)
            );
        }

        if (groups.bottoms.length) {
            outfit.push(
                isCold
                    ? pickWeatherMatch(groups.bottoms, ['jeans', 'pants', 'leggings'])
                    : isHot
                        ? pickWeatherMatch(groups.bottoms, ['shorts', 'skirt'])
                        : pickRandom(groups.bottoms)
            );
        }
    }

    if (groups.shoes.length) {
        outfit.push(pickRandom(groups.shoes));
    }

    if (groups.outerwear.length && (isCold || isRainy || (!isHot && Math.random() < 0.3))) {
        outfit.push(
            isRainy
                ? pickWeatherMatch(groups.outerwear, ['raincoat', 'rain jacket', 'waterproof'])
                : isCold
                    ? pickWeatherMatch(groups.outerwear, ['coat', 'jacket', 'hoodie'])
                    : pickRandom(groups.outerwear)
        );
    }

    if (groups.accessories.length && Math.random() < 0.4) {
        outfit.push(pickRandom(groups.accessories));
    }

    return outfit;
}


    function displayLook(outfit) {
        clothingLayer.innerHTML = '';

        outfit.forEach(item => {
            const position = positions[item.article_type];
            const image = document.createElement('img');

            image.src = item.image;
            image.alt = item.name;
            image.className = 'home-mannequin-clothing';
            image.style.top = position.top;
            image.style.left = position.left;
            image.style.width = position.width;
            image.style.height = position.height;
            image.style.zIndex = layers[item.article_type];

            clothingLayer.appendChild(image);
        });

        lookCounter.textContent = `Look ${String(lookNumber).padStart(2, '0')}`;

        
const temperature = currentWeather?.temperature;
const weatherCode = currentWeather?.weatherCode;

let weatherReason = 'A fresh combination using pieces from your wardrobe!';

if (temperature !== undefined) {
    if (temperature >= 80) {
        weatherReason = `It's ${temperature}°F outside, so we're leaning toward lighter clothing.`;
    } else if (temperature >= 60) {
        weatherReason = `At ${temperature}°F, this look is a great starting point for a mild day.`;
    } else {
        weatherReason = `It's ${temperature}°F outside, so we're prioritizing warmer layers.`;
    }

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode)) {
        weatherReason += ' Rain is also in the forecast, so consider weather-resistant pieces.';
    }
}

recommendationText.textContent = outfit.length
    ? `${weatherReason} Featuring ${outfit.map(item => item.name).join(', ')}. ♡`
    : 'Add some clothing to your wardrobe to start receiving outfit recommendations! ♡';

    }

    function showNewLook() {
        let outfit = generateLook();
        let signature = outfit.map(item => item.id).sort().join(',');

        for (let attempt = 0; attempt < 10 && signature === currentSignature; attempt++) {
            outfit = generateLook();
            signature = outfit.map(item => item.id).sort().join(',');
        }

        currentSignature = signature;
        lookNumber++;
        displayLook(outfit);
    }

    newLookButton?.addEventListener('click', showNewLook);
    lookArrows.forEach(arrow => arrow.addEventListener('click', showNewLook));

    showNewLook();
});
