  let fuse;
    let allProducts = [];

    // Инициализация корзины (достаем из памяти браузера, если там что-то было)
    let cart = JSON.parse(localStorage.getItem('pryanikoff_cart')) || [];
    updateCartCount();

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allProducts = Array.isArray(data) ? data : [data];

            // Настройка поиска
            const options = {
                keys: ['Название', 'Артикул продавца', 'Артикул'],
                threshold: 0.4
            };
            fuse = new Fuse(allProducts, options);

            // Пункт 4: Показываем 12 случайных карточек при загрузке
            showRandomCards();
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });

    // Функция для вывода 12 случайных карточек
    function showRandomCards() {
        // Перемешиваем массив (алгоритм Фишера-Йетса)
        let shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        // Берем первые 12
        let randomProducts = shuffled.slice(0, 12);
        
        renderProducts(randomProducts, randomContainer);
    }

    // Поиск
    searchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        resultsContainer.innerHTML = '';

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            randomTitle.style.display = 'block';
            randomContainer.style.display = 'grid';
            return;
        }

        // Скрываем "Популярные формы", когда идет поиск
        randomTitle.style.display = 'none';
        randomContainer.style.display = 'none';

        if (fuse) {
            const results = fuse.search(query);
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p class="hint">Ничего не найдено.</p>';
                return;
            }
            renderProducts(results.map(r => r.item), resultsContainer);
13:18
}
    });

    // Функция отрисовки карточек (используется и для поиска, и для случайных)
    function renderProducts(products, container) {
        products.forEach(product => {
            const name = product['Название'] || 'Без названия';
            let sku = product['Артикул продавца'];
            if (!sku || sku === '[PREMIUM]') sku = product['Артикул'];
            
            const price = product['Цена'] || '—';
            const image = product['Картинка'] || 'https://via.placeholder.com/200?text=Нет+фото';
            const url = product['URL'] || '#';

            const card = document.createElement('div');
            card.className = 'product-card';

            card.innerHTML = `
                <a href="${url}" target="_blank">
                    <img src="${image}" alt="${name}" class="product-image">
                </a>
                <div>
                    <h3>${name}</h3>
                    <p style="font-size:0.9rem; color:#777;">Арт: ${sku}</p>
                    <div class="price">${price} ₽</div>
                </div>
                <button class="add-to-cart-btn" data-id="${sku}">В корзину</button>
            `;

            // Обработчик кнопки "В корзину"
            const btn = card.querySelector('.add-to-cart-btn');
            btn.addEventListener('click', () => {
                addToCart(product);
                btn.textContent = 'Добавлено ✓';
                setTimeout(() => btn.textContent = 'В корзину', 1500);
            });

            container.appendChild(card);
        });
    }

    // Логика корзины
    function addToCart(product) {
        // Проверяем, есть ли уже такой товар
        const existingItem = cart.find(item => item['Артикул'] === product['Артикул']);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            product.quantity = 1;
            cart.push(product);
        }
        
        // Сохраняем в память браузера
        localStorage.setItem('pryanikoff_cart', JSON.stringify(cart));
        updateCartCount();
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountSpan.textContent = totalItems;
    }
});