document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    const randomContainer = document.getElementById('random-container');
    const randomBlock = document.getElementById('random-block');
    
    // Пагинация
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    let currentPage = 1;
    const itemsPerPage = 12;
    let shuffledProducts = [];

    // Элементы корзины
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.getElementById('close-cart');
    const cartCountSpan = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    let fuse;
    let allProducts = [];
    let cart = JSON.parse(localStorage.getItem('pryanikoff_cart')) || [];

    // Обновляем интерфейс корзины при старте
    updateCartUI();

    // Загружаем ДВА файла (ВБ и Озон)
    Promise.all([
        fetch('data.json').then(res => res.json()).catch(() => []),
        fetch('ozon.json').then(res => res.json()).catch(() => [])
    ]).then(([wbData, ozonData]) => {
        
        const wbArray = Array.isArray(wbData) ? wbData : [wbData];
        const ozonArray = Array.isArray(ozonData) ? ozonData : [ozonData];

        // Создаем словарь Озона по названию для быстрого поиска
        const ozonMap = new Map();
        ozonArray.forEach(op => {
            const name = (op['Название'] || '').trim().toLowerCase();
            if (name) ozonMap.set(name, op);
        });

        const mergedProducts = [];
        const usedOzonNames = new Set();

        // Объединяем товары ВБ с товарами Озон
        wbArray.forEach(wbItem => {
            const name = (wbItem['Название'] || '').trim().toLowerCase();
            const ozonItem = ozonMap.get(name);

            if (ozonItem) {
                wbItem['ozonPrice'] = ozonItem['Цена'];
                wbItem['ozonUrl'] = ozonItem['URL'];
                usedOzonNames.add(name);
            }
            mergedProducts.push(wbItem);
        });

        // Добавляем товары, которые есть ТОЛЬКО на Озоне
        ozonArray.forEach(ozonItem => {
            const name = (ozonItem['Название'] || '').trim().toLowerCase();
            if (!usedOzonNames.has(name)) {
                ozonItem['isOzonOnly'] = true;
                mergedProducts.push(ozonItem);
            }
        });

        allProducts = mergedProducts;

        // Настройка поиска
        const options = { keys: ['Название', 'Артикул продавца', 'Артикул'], threshold: 0.4 };
        fuse = new Fuse(allProducts, options);

        // Перемешиваем ОДИН РАЗ при загрузке, чтобы не было повторов при листании
        shuffledProducts = [...allProducts].sort(() => 0.5 - Math.random());
        renderPage(1);
    })
    .catch(error => console.error('Ошибка загрузки:', error));

    // --- ПАГИНАЦИЯ ---
    function renderPage(page) {
        currentPage = page;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productsToShow = shuffledProducts.slice(startIndex, endIndex);

        randomContainer.innerHTML = '';
        renderProducts(productsToShow, randomContainer);

        const totalPages = Math.ceil(shuffledProducts.length / itemsPerPage);
        if (totalPages === 0) {
             pageInfo.textContent = `Стр. 1 из 1`;
             prevBtn.disabled = true;
             nextBtn.disabled = true;
             return;
        }

        pageInfo.textContent = `Стр. ${currentPage} из ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    prevBtn.addEventListener('click', () => { if (currentPage > 1) renderPage(currentPage - 1); });
    nextBtn.addEventListener('click', () => { 
        const totalPages = Math.ceil(shuffledProducts.length / itemsPerPage);
        if (currentPage < totalPages) renderPage(currentPage + 1); 
    });

    // --- ПОИСК ---
    searchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        resultsContainer.innerHTML = '';

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            randomBlock.style.display = 'block';
            return;
        }

        randomBlock.style.display = 'none';

        if (fuse) {
            const results = fuse.search(query);
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p class="hint">Ничего не найдено.</p>';
                return;
            }
            renderProducts(results.map(r => r.item), resultsContainer);
        }
    });

    // --- ОТРИСОВКА КАРТОЧЕК ---
    function renderProducts(products, container) {
        products.forEach(product => {
            const name = product['Название'] || 'Без названия';
            const uniqueId = String(product['Артикул'] || product['Артикул продавца']);
            
            const image = product['Картинка'] || 'https://via.placeholder.com/200?text=Нет+фото';
            
            // Данные ВБ
            const wbPrice = product['isOzonOnly'] ? null : (product['Цена'] || '—');
            const wbUrl = product['isOzonOnly'] ? null : (product['URL'] || '#');

            // Данные Озона
            const ozonPrice = product['ozonPrice'] || (product['isOzonOnly'] ? product['Цена'] : null);
            const ozonUrl = product['ozonUrl'] || (product['isOzonOnly'] ? product['URL'] : null);

            let buttonsHtml = '';
            let priceHtml = '';

            // Собираем цены и кнопки
            if (wbPrice && ozonPrice) {
                priceHtml = `<div class="price-container">
                    <div>WB: <span>${wbPrice} ₽</span></div>
                    <div>Ozon: <span>${ozonPrice} ₽</span></div>
                </div>`;
                buttonsHtml = `<div class="buttons-row">
                    <a href="${wbUrl}" target="_blank" class="market-btn wb-btn">WB</a>
                    <a href="${ozonUrl}" target="_blank" class="market-btn ozon-btn">Ozon</a>
                </div>`;
            } else if (wbPrice) {
                priceHtml = `<div class="price-container"><div>Цена: <span>${wbPrice} ₽</span></div></div>`;
                buttonsHtml = `<a href="${wbUrl}" target="_blank" class="market-btn wb-btn" style="width:100%; display:block; box-sizing:border-box;">Купить на WB</a>`;
            } else if (ozonPrice) {
                priceHtml = `<div class="price-container"><div>Цена: <span>${ozonPrice} ₽</span></div></div>`;
                buttonsHtml = `<a href="${ozonUrl}" target="_blank" class="market-btn ozon-btn" style="width:100%; display:block; box-sizing:border-box;">Купить на Ozon</a>`;
            }

            const card = document.createElement('div');
            card.className = 'product-card';

            card.innerHTML = `
                <img src="${image}" alt="${name}" class="product-image">
                <div>
                    <h3>${name}</h3>
                    <p style="font-size: 0.9rem; color: #777;">Арт: ${uniqueId}</p>
                    ${priceHtml}
                </div>
                <div>
                    ${buttonsHtml}
                    <button class="add-to-cart-btn">В корзину</button>
                </div>
            `;

            // Обработчик добавления в корзину
            const btn = card.querySelector('.add-to-cart-btn');
            btn.addEventListener('click', () => {
                const cartPrice = Number(wbPrice) || Number(ozonPrice) || 0;
                addToCart(product, uniqueId, cartPrice);
                btn.textContent = 'Добавлено ✓';
                setTimeout(() => btn.textContent = 'В корзину', 1500);
            });

            container.appendChild(card);
        });
    }

    // --- ЛОГИКА КОРЗИНЫ ---
    function addToCart(product, id, price) {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: id,
                name: product['Название'],
                price: price,
                quantity: 1
            });
        }
        saveCart();
    }

    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        saveCart();
    }

    function changeQuantity(id, delta) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                removeFromCart(id);
            } else {
                saveCart();
            }
        }
    }

    function saveCart() {
        localStorage.setItem('pryanikoff_cart', JSON.stringify(cart));
        updateCartUI();
    }

    // Обновление корзины
    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountSpan.textContent = totalItems;

        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; color:#777;">Корзина пуста</p>';
            cartTotalPrice.textContent = '0';
            return;
        }

        cart.forEach(item => {
            totalPrice += item.price * item.quantity;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price} ₽</div>
                </div>
                <div class="cart-item-controls">
                    <button class="minus">-</button>
                    <span>${item.quantity}</span>
                    <button class="plus">+</button>
                    <button class="remove-btn" title="Удалить">&times;</button>
                </div>
            `;
            // Привязываем кнопки
            div.querySelector('.minus').addEventListener('click', () => changeQuantity(item.id, -1));
            div.querySelector('.plus').addEventListener('click', () => changeQuantity(item.id, 1));
            div.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.id));
            cartItemsContainer.appendChild(div);
        });
        cartTotalPrice.textContent = totalPrice;
    }

    // Управление окном корзины
    cartBtn.addEventListener('click', () => cartModal.classList.add('active'));
    closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
    cartModal.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.classList.remove('active'); });

    // Оформление заказа
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert('Корзина пуста!');
        let orderText = "Здравствуйте! Хочу заказать:\n\n";
        let total = 0;
        cart.forEach(item => {
            orderText += `- ${item.name} x${item.quantity} = ${item.price * item.quantity} ₽\n`;
            total += item.price * item.quantity;
        });
        orderText += `\nИтого: ${total} ₽`;
        
        navigator.clipboard.writeText(orderText).then(() => {
            alert("Заказ сформирован! Текст скопирован в буфер обмена. Вставьте его в наш Telegram.");
        }).catch(() => {
            alert("Не удалось скопировать автоматически. Вот ваш заказ:\n\n" + orderText);
        });
    });
});