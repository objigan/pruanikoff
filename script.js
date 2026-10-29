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

    // Модальные окна
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const closeAbout = document.getElementById('close-about');

    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.getElementById('close-cart');

    const cartCountSpan = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items-container');
    
    let fuse;
    let allProducts = [];
    
    // Корзина теперь хранит массив объектов: {id, name, wbUrl, ozonUrl}
    let cart = JSON.parse(localStorage.getItem('pryanikoff_cart_v2')) || [];

    updateCartUI();

    // Загружаем данные
    Promise.all([
        fetch('data.json').then(res => res.json()).catch(() => []),
        fetch('ozon.json').then(res => res.json()).catch(() => [])
    ]).then(([wbData, ozonData]) => {
        
        const wbArray = Array.isArray(wbData) ? wbData : [wbData];
        const ozonArray = Array.isArray(ozonData) ? ozonData : [ozonData];

        const ozonMap = new Map();
        ozonArray.forEach(op => {
            const name = (op['Название'] || '').trim().toLowerCase();
            if (name) ozonMap.set(name, op);
        });

        const mergedProducts = [];
        const usedOzonNames = new Set();

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

        ozonArray.forEach(ozonItem => {
            const name = (ozonItem['Название'] || '').trim().toLowerCase();
            if (!usedOzonNames.has(name)) {
                ozonItem['isOzonOnly'] = true;
                mergedProducts.push(ozonItem);
            }
        });

        allProducts = mergedProducts;

        const options = { keys: ['Название', 'Артикул продавца', 'Артикул'], threshold: 0.4 };
        fuse = new Fuse(allProducts, options);

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
            
            const wbPrice = product['isOzonOnly'] ? null : (product['Цена'] || '—');
            const wbUrl = product['isOzonOnly'] ? null : (product['URL'] || '#');

            const ozonPrice = product['ozonPrice'] || (product['isOzonOnly'] ? product['Цена'] : null);
            const ozonUrl = product['ozonUrl'] || (product['isOzonOnly'] ? product['URL'] : null);

            let buttonsHtml = '';
            let priceHtml = '';

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

            const btn = card.querySelector('.add-to-cart-btn');
            btn.addEventListener('click', () => {
                addToCart(name, uniqueId, wbUrl, ozonUrl);
                btn.textContent = 'Добавлено ✓';
                setTimeout(() => btn.textContent = 'В корзину', 1500);
            });

            container.appendChild(card);
        });
    }

    // --- ЛОГИКА КОРЗИНЫ (ТОЛЬКО СПИСОК ССЫЛОК) ---
    function addToCart(name, id, wbUrl, ozonUrl) {
        // Проверяем, есть ли уже такой товар, чтобы не дублировать
        const exists = cart.find(item => item.id === id);
        if (!exists) {
            cart.push({ id, name, wbUrl, ozonUrl });
            saveCart();
        }
    }

    function saveCart() {
        localStorage.setItem('pryanikoff_cart_v2', JSON.stringify(cart));
        updateCartUI();
    }

    function updateCartUI() {
        cartCountSpan.textContent = cart.length;
        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-text">Корзина пуста</p>';
            return;
        }

        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-list-item';
            
            let linksHtml = '';
            if (item.wbUrl && item.wbUrl !== '#') {
                linksHtml += `<a href="${item.wbUrl}" target="_blank" class="cart-link-btn wb-btn">Купить на WB</a>`;
            }
            if (item.ozonUrl && item.ozonUrl !== '#') {
                linksHtml += `<a href="${item.ozonUrl}" target="_blank" class="cart-link-btn ozon-btn">Купить на Ozon</a>`;
            }
            if (!linksHtml) {
                linksHtml = '<span style="font-size:0.8rem; color:red;">Ссылки нет</span>';
            }

            div.innerHTML = `
                <div class="cart-list-title">${item.name}</div>
                <div class="cart-links-row">${linksHtml}</div>
            `;
            cartItemsContainer.appendChild(div);
        });
    }

    // --- УПРАВЛЕНИЕ ОКНАМИ ---
    // О нас
    aboutBtn.addEventListener('click', () => aboutModal.classList.add('active'));
    closeAbout.addEventListener('click', () => aboutModal.classList.remove('active'));
    aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.remove('active'); });

    // Корзина
    cartBtn.addEventListener('click', () => cartModal.classList.add('active'));
    closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
    cartModal.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.classList.remove('active'); });
});