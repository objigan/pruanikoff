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

            // Формируем кнопки и цены в зависимости от наличия на маркетплейсах
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
                buttonsHtml = `<a href="${wbUrl}" target="_blank" class="market-btn wb-btn" style="width:100%">Купить на WB</a>`;
            } else if (ozonPrice) {
                priceHtml = `<div class="price-container"><div>Цена: <span>${ozonPrice} ₽</span></div></div>`;
                buttonsHtml = `<a href="${ozonUrl}" target="_blank" class="market-btn ozon-btn" style="width:100%">Купить на Ozon</a>`;
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
                // Для корзины берем цену ВБ (если есть) или Озона
                const cartPrice = Number(wbPrice) || Number(ozonPrice) || 0;
                addToCart(product, uniqueId, cartPrice);
                btn.textContent = 'Добавлено ✓';
                setTimeout(() => btn.textContent = 'В корзину', 1500);
            });container.appendChild(card);
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
            div.querySelector('.minus').addEventListener('click', () => changeQuantity(item.id, -1));
            div.querySelector('.plus').addEventListener('click', () => changeQuantity(item.id, 1));
            div.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.id));
            cartItemsContainer.appendChild(div);
        });
        cartTotalPrice.textContent = totalPrice;
    }

    // Открытие/закрытие корзины
    cartBtn.addEventListener('click', () => cartModal.classList.add('active'));
    closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
    cartModal.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.classList.remove('active'); });

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
        });
    });
};