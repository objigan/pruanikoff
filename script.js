document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    const randomContainer = document.getElementById('random-container');
    const randomTitle = document.getElementById('random-title');
    
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

    // Достаем корзину из памяти браузера или создаем пустую
    let cart = JSON.parse(localStorage.getItem('pryanikoff_cart')) || [];
    updateCartUI();

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allProducts = Array.isArray(data) ? data : [data];
            const options = { keys: ['Название', 'Артикул продавца', 'Артикул'], threshold: 0.4 };
            fuse = new Fuse(allProducts, options);
            showRandomCards();
        })
        .catch(error => console.error('Ошибка:', error));

    function showRandomCards() {
        let shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        let randomProducts = shuffled.slice(0, 12);
        renderProducts(randomProducts, randomContainer);
    }

    searchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        resultsContainer.innerHTML = '';

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            randomTitle.style.display = 'block';
            randomContainer.style.display = 'grid';
            return;
        }

        randomTitle.style.display = 'none';
        randomContainer.style.display = 'none';

        if (fuse) {
            const results = fuse.search(query);
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p class="hint">Ничего не найдено.</p>';
                return;
            }
            renderProducts(results.map(r => r.item), resultsContainer);
        }
    });

    function renderProducts(products, container) {
        products.forEach(product => {
            const name = product['Название'] || 'Без названия';
            let sku = product['Артикул продавца'];
            if (!sku || sku === '[PREMIUM]') sku = product['Артикул'];
            
            const price = product['Цена'] || 0;
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
                    <p style="font-size: 0.9rem; color: #777;">Арт: ${sku}</p>
                    <div class="price">${price} ₽</div>
                </div>
                <button class="add-to-cart-btn">В корзину</button>
            `;

            const btn = card.querySelector('.add-to-cart-btn');
            btn.addEventListener('click', () => {
                addToCart(product);
                btn.textContent = 'Добавлено ✓';
                setTimeout(() => btn.textContent = 'В корзину', 1500);
            });

            container.appendChild(card);
        });
    }

    // --- ЛОГИКА КОРЗИНЫ ---

    function addToCart(product) {
        const existingItem = cart.find(item => item['Артикул'] === product['Артикул']);if (existingItem) {
            existingItem.quantity += 1;
        } else {
            product.quantity = 1;
            cart.push(product);
        }
        saveCart();
    }

    function removeFromCart(articul) {
        cart = cart.filter(item => item['Артикул'] !== articul);
        saveCart();
    }

    function changeQuantity(articul, delta) {
        const item = cart.find(item => item['Артикул'] === articul);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                removeFromCart(articul);
            } else {
                saveCart();
            }
        }
    }

    function saveCart() {
        localStorage.setItem('pryanikoff_cart', JSON.stringify(cart));
        updateCartUI();
    }

    // Обновляем счетчик в шапке и список в окне
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
            const price = Number(item['Цена']) || 0;
            totalPrice += price * item.quantity;
            
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${item['Название']}</div>
                    <div class="cart-item-price">${price} ₽</div>
                </div>
                <div class="cart-item-controls">
                    <button class="minus">-</button>
                    <span>${item.quantity}</span>
                    <button class="plus">+</button>
                    <button class="remove-btn">&times;</button>
                </div>
            `;

            div.querySelector('.minus').onclick = () => changeQuantity(item['Артикул'], -1);
            div.querySelector('.plus').onclick = () => changeQuantity(item['Артикул'], 1);
            div.querySelector('.remove-btn').onclick = () => removeFromCart(item['Артикул']);

            cartItemsContainer.appendChild(div);
        });

        cartTotalPrice.textContent = totalPrice;
    }

    // Открытие/закрытие окна
    cartBtn.addEventListener('click', () => cartModal.classList.add('active'));
    closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) cartModal.classList.remove('active');
    });

    // Кнопка Оформить заказ
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Корзина пуста!');
            return;
        }
        
        // Формируем текст для отправки (пока просто выводим в alert)
        let orderText = "Здравствуйте! Хочу заказать:\n\n";
        let total = 0;
        cart.forEach(item => {
            const price = Number(item['Цена']) || 0;
            orderText += `- ${item['Название']} (Арт: ${item['Артикул']}) x${item.quantity} = ${price * item.quantity} ₽\n`;
            total += price * item.quantity;
        });
        orderText += `\nИтого: ${total} ₽`;

        alert("Заказ сформирован!\n\n" + orderText + "\n\n(Здесь мы позже настроим отправку в Telegram)");
    });
});