document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    let fuse;

    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Не удалось загрузить data.json');
            }
            return response.json();
        })
        .then(data => {
            // Если пришёл один объект — делаем из него массив
            const products = Array.isArray(data) ? data : [data];

            const options = {
                // Поля, по которым ищем. Можно добавить свои.
                keys: ['Название', 'Артикул продавца', 'Артикул'],
                threshold: 0.4,
                includeScore: true
            };

            fuse = new Fuse(products, options);
            console.log('Данные загружены, поиск готов!');
        })
        .catch(error => {
            console.error('Ошибка:', error);
            resultsContainer.innerHTML = '<p class="hint">Ошибка загрузки каталога. Проверьте, что файл data.json лежит рядом с index.html.</p>';
        });

    searchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        resultsContainer.innerHTML = '';

        if (query.length < 2) {
            resultsContainer.innerHTML = '<p class="hint">Начните вводить название или артикул...</p>';
            return;
        }

        if (fuse) {
            const results = fuse.search(query);

            if (results.length === 0) {
                resultsContainer.innerHTML = '<p class="hint">Ничего не найдено. Попробуйте другой запрос.</p>';
                return;
            }

            results.forEach(result => {
                const product = result.item;

                // Достаём данные из русских полей
                const name = product['Название'] || 'Без названия';

                // Артикул: если "Артикул продавца" скрыт как [PREMIUM], берём "Артикул"
                let sku = product['Артикул продавца'];
                if (!sku || sku === '[PREMIUM]') {
                    sku = product['Артикул'] || '—';
                }

                const price = product['Цена'] || product['Спец. цена'] || '—';
                const image = product['Картинка'] || '';
                const url = product['URL'] || '#';

                const card = document.createElement('div');
                card.className = 'product-card';

                card.innerHTML = `
                    ${image ? `<img src="${image}" alt="${name}" class="product-image">` : ''}
                    <div class="product-info">
                        <h3>${name}</h3>
                        <p>Артикул: <span class="sku">${sku}</span></p>
                        <p>Цена: ${price} ₽</p>
                        <a href="${url}" target="_blank" class="wb-link">Открыть на Wildberries</a>
                    </div>
                `;

                resultsContainer.appendChild(card);
            });
        }
    });
});