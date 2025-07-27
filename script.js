// script.js (変数重複解消・最終完全版)

document.addEventListener('DOMContentLoaded', () => {
    // ★★★ 変数定義をこのブロックに全て集約 ★★★
    const API_BASE_URL = 'https://my-order-link.onrender.com/api';
    const menuContainer = document.getElementById('menu-container');
    const tabContainer = document.querySelector('.category-tabs');
    const callStaffBtn = document.getElementById('call-staff-btn');
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalPriceElement = document.getElementById('cart-total-price');
    const modalOverlay = document.getElementById('modal-overlay');
    const showModalBtn = document.getElementById('show-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    const modalCartItems = document.getElementById('modal-cart-items');
    const modalTotalPrice = document.getElementById('modal-total-price');
    const checkoutRequestBtn = document.getElementById('checkout-request-btn');
    const historyModalOverlay = document.getElementById('history-modal-overlay');
    const historyModalItems = document.getElementById('history-modal-items');
    const historyModalTotal = document.getElementById('history-modal-total');
    const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
    const confirmCheckoutBtn = document.getElementById('confirm-checkout-btn');
    const storeNameDisplay = document.getElementById('store-name-display');
    const tableLabel = document.getElementById('table-label');
    const tableNumberValue = document.getElementById('table-number-value');
    const cartElement = document.querySelector('.cart');
    const cartHeader = document.querySelector('.cart-header h2');
    const cartItemCountBadge = document.getElementById('cart-item-count-badge');
    const langJpBtn = document.getElementById('lang-jp-btn');
    const langEnBtn = document.getElementById('lang-en-btn');

    let cart = {};
    let currentTableId = null;
    let currentAccessToken = null;
    let orderHistory = { items: [], total_price: 0 };
    let allProductsData = [];
    let allCategoriesData = [];
    let currentLanguage = 'jp';
    let storeInfo = { name: 'レストラン「My Order LINK」' }; 

    const translations = {
        jp: { table: "テーブル番号", checkout: "🧾 会計", call_staff: "🔔 スタッフ呼び出し", menu_loading: "メニューを読み込んでいます...", order_list: "注文リスト", cart_title: "カート (追加する商品)", cart_empty: "カートは空です。", cart_total: "カート合計", yen: "円", items: "品", confirm_order_btn: "注文内容の確認へ", modal_title: "ご注文内容の確認", modal_total_label: "合計金額", modal_back_btn: "戻って編集する", modal_confirm_btn: "この内容で注文を確定する", history_title: "ご注文履歴と会計", history_desc: "これまでのご注文は以下の通りです。", history_total_label: "お会計金額 (合計)", history_note: "お会計を希望される場合は、下のボタンを押してスタッフをお呼びください。", history_close_btn: "閉じる", history_checkout_btn: "会計のためにスタッフを呼ぶ", status_cooking: "調理中", status_ready: "提供待ち", status_served: "提供済み", status_unknown: "不明", add_to_cart: "カートに追加", price_label: "価格", sold_out: "品切れ" },
        en: { table: "Table No.", checkout: "🧾 Bill", call_staff: "🔔 Call Staff", menu_loading: "Loading menu...", order_list: "Order List", cart_title: "Cart (Items to add)", cart_empty: "Cart is empty.", cart_total: "Cart Total", yen: "JPY", items: "items", confirm_order_btn: "Confirm Order", modal_title: "Confirm Your Order", modal_total_label: "Total Amount", modal_back_btn: "Back to Edit", modal_confirm_btn: "Confirm and Place Order", history_title: "Order History & Bill", history_desc: "Your orders so far are as follows.", history_total_label: "Total Bill Amount", history_note: "If you wish to pay, please press the button below to call a staff member.", history_close_btn: "Close", history_checkout_btn: "Call Staff for Bill", status_cooking: "Cooking", status_ready: "Ready", status_served: "Served", status_unknown: "Unknown", add_to_cart: "Add to Cart", price_label: "Price", sold_out: "Sold Out" }
    };

    async function showOpeningScreen() {
        try {
            const response = await fetch(`${API_BASE_URL}/get_opening_settings`);
            if (!response.ok) return Promise.resolve();
            const settings = await response.json();
            const logoUrl = "/images/rise-logo.png";
            const imageUrl1 = settings.opening_image_url;
            const imageUrl2 = settings.opening_image_url_2;
            const creditText = settings.credit_text || "powered by RISE with Google AI Studio";
            if (!imageUrl1) return Promise.resolve();
    
            return new Promise(resolve => {
                const overlay = document.createElement('div');
                overlay.id = 'customer-opening-overlay';
                const logoDuration = 2000, image1Duration = 3000, image2Duration = 3000, fadeDuration = 1500;
                const logo = document.createElement('img');
                logo.src = logoUrl;
                logo.className = 'customer-opening-logo';
                const credit = document.createElement('div');
                credit.className = 'customer-opening-credit';
                credit.textContent = creditText;
                overlay.appendChild(logo);
                overlay.appendChild(credit);
                document.body.prepend(overlay);
    
                setTimeout(() => {
                    logo.style.transition = `opacity ${fadeDuration / 1000}s`;
                    credit.style.transition = `opacity ${fadeDuration / 1000}s`;
                    logo.style.opacity = '0';
                    credit.style.opacity = '0';
    
                    setTimeout(() => {
                        overlay.style.backgroundImage = `url(${imageUrl1})`;
                        overlay.style.backgroundSize = 'cover';
                        overlay.style.backgroundPosition = 'center';
                        overlay.innerHTML = '';
    
                        setTimeout(() => {
                            if (imageUrl2) {
                                const nextSlide = document.createElement('div');
                                nextSlide.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:url(' + imageUrl2 + ') center/cover;opacity:0;transition:opacity ' + (fadeDuration / 1000) + 's;';
                                overlay.appendChild(nextSlide);
                                setTimeout(() => { nextSlide.style.opacity = '1'; }, 100);
    
                                setTimeout(() => {
                                    overlay.classList.add('is-closing');
                                    overlay.addEventListener('transitionend', () => { if (overlay.parentElement) overlay.remove(); resolve(); }, { once: true });
                                }, image2Duration);
                            } else {
                                overlay.classList.add('is-closing');
                                overlay.addEventListener('transitionend', () => { if (overlay.parentElement) overlay.remove(); resolve(); }, { once: true });
                            }
                        }, image1Duration);
                    }, fadeDuration);
                }, logoDuration);
            });
        } catch (error) {
            console.error("オープニング設定の取得または表示エラー:", error);
            return Promise.resolve();
        }
    }

    async function initializeMenu() {
        try {
            const [productsRes, categoriesRes] = await Promise.all([ fetch(`${API_BASE_URL}/get_products`), fetch(`${API_BASE_URL}/get_categories`) ]);
            if (!productsRes.ok || !categoriesRes.ok) throw new Error('APIからのデータ取得に失敗');
            allProductsData = await productsRes.json();
            allCategoriesData = await categoriesRes.json();
            renderCategoryTabs(allCategoriesData);
            renderMenuItems(allProductsData);
            filterMenuByCategory('all');
        } catch (error) {
            if (menuContainer) menuContainer.innerHTML = `<p style="text-align:center;">${translations[currentLanguage].menu_loading}</p>`;
            console.error(error);
        }
    }

    async function refreshOrderHistory() {
        if (!currentTableId || !currentAccessToken) return;
        try {
            const res = await fetch(`${API_BASE_URL}/get_order_history/${currentTableId}?token=${currentAccessToken}`);
            if (!res.ok) { orderHistory = { items: [], total_price: 0 }; return; }
            orderHistory = await res.json();
        } catch (error) {
            console.error("注文履歴の取得中にエラー:", error);
            orderHistory = { items: [], total_price: 0 };
        }
    }

    function updateCartAndTotals() {
        if (!cartItemsList || !cartTotalPriceElement || !cartItemCountBadge) return;
        cartItemsList.innerHTML = '';
        let cartTotal = 0;
        let totalItemsInCart = 0;
        const itemCountInCart = Object.keys(cart).length;
        showModalBtn.disabled = (itemCountInCart === 0);
        if (itemCountInCart === 0) {
            cartItemsList.innerHTML = `<li>${translations[currentLanguage].cart_empty}</li>`;
        } else {
            for (const name_jp in cart) {
                const item = cart[name_jp];
                const product = allProductsData.find(p => p.name === name_jp);
                const name = (currentLanguage === 'en' && product?.name_en) ? product.name_en : name_jp;
                totalItemsInCart += item.quantity;
                cartTotal += item.price * item.quantity;
                const li = document.createElement('li');
                li.innerHTML = `<span>${name}</span><div class="item-controls"><button class="quantity-btn sidebar-minus-btn" data-name="${name_jp}">-</button><span>${item.quantity}</span><button class="quantity-btn sidebar-plus-btn" data-name="${name_jp}">+</button><button class="delete-btn sidebar-delete-btn" data-name="${name_jp}">🗑️</button></div>`;
                cartItemsList.appendChild(li);
            }
        }
        cartTotalPriceElement.textContent = cartTotal.toLocaleString();
        cartItemCountBadge.textContent = `(${totalItemsInCart}${translations[currentLanguage].items})`;
    }

    function updateModalCart() {
        if (!modalCartItems || !modalTotalPrice) return;
        modalCartItems.innerHTML = '';
        let total = 0;
        for (const name_jp in cart) {
            const item = cart[name_jp];
            const product = allProductsData.find(p => p.name === name_jp);
            const name = (currentLanguage === 'en' && product?.name_en) ? product.name_en : name_jp;
            total += item.price * item.quantity;
            const div = document.createElement('div');
            div.innerHTML = `<div class="item-details"><strong>${name}</strong><span>${(item.price * item.quantity).toLocaleString()} ${translations[currentLanguage].yen}</span></div><div class="item-controls"><button class="quantity-btn modal-minus-btn" data-name="${name_jp}">-</button><span class="item-quantity">${item.quantity}</span><button class="quantity-btn modal-plus-btn" data-name="${name_jp}">+</button><button class="delete-btn modal-delete-btn" data-name="${name_jp}">🗑️</button></div>`;
            modalCartItems.appendChild(div);
        }
        modalTotalPrice.textContent = total.toLocaleString();
        if (Object.keys(cart).length === 0) {
            modalOverlay.classList.add('hidden');
        }
    }

    function openHistoryModal() {
        if (!historyModalItems || !historyModalTotal || !historyModalOverlay) return;
        historyModalItems.innerHTML = '';
        if (orderHistory.items.length === 0) {
            historyModalItems.innerHTML = '<div>まだ注文はありません。</div>';
            confirmCheckoutBtn.disabled = false;
        } else {
            confirmCheckoutBtn.disabled = false;
            orderHistory.items.forEach(item => {
                const product = allProductsData.find(p => p.name === item.item_name);
                const name = (currentLanguage === 'en' && product?.name_en) ? product.name_en : item.item_name;
                let statusText, statusClass;
                switch (item.item_status) {
                    case 'cooking': statusText = translations[currentLanguage].status_cooking; statusClass = 'status-cooking'; break;
                    case 'ready': statusText = translations[currentLanguage].status_ready; statusClass = 'status-ready'; break;
                    case 'served': statusText = translations[currentLanguage].status_served; statusClass = 'status-served'; break;
                    default: statusText = translations[currentLanguage].status_unknown; statusClass = '';
                }
                const div = document.createElement('div');
                div.innerHTML = `<span><span class="status-badge ${statusClass}">${statusText}</span>${name} x ${item.quantity}</span><span>${(item.price * item.quantity).toLocaleString()} ${translations[currentLanguage].yen}</span>`;
                historyModalItems.appendChild(div);
            });
        }
        historyModalTotal.textContent = (orderHistory.total_price || 0).toLocaleString();
        historyModalOverlay.classList.remove('hidden');
    }

    function renderCategoryTabs(categories) {
        if (!tabContainer) return;
        let html = '<button class="tab-btn active" data-category="all">すべて</button>';
        categories.forEach(cat => { 
            const name = (currentLanguage === 'en' && cat.name_en) ? cat.name_en : cat.name_jp;
            html += `<button class="tab-btn" data-category="${cat.name_jp}">${name}</button>`; 
        });
        tabContainer.innerHTML = html;
    }

    function renderMenuItems(products) {
        if (!menuContainer) return;
        menuContainer.innerHTML = '';
        products.forEach(product => menuContainer.appendChild(createMenuItemElement(product)));
    }

    function createMenuItemElement(product) {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.dataset.name = product.name;
        div.dataset.price = product.price;
        div.dataset.category = product.category || ''; 
        if (product.is_sold_out) div.classList.add('sold-out');
        const lang = currentLanguage;
        const name = (lang === 'en' && product.name_en) ? product.name_en : product.name;
        const description = (lang === 'en' && product.description_en) ? product.description_en : product.description;
        const priceText = `${translations[lang].price_label}: ${product.price.toLocaleString()}${translations[lang].yen}`;
        const addToCartText = translations[lang].add_to_cart;
        const imagePath = product.image_path ? `/static/images/${product.image_path}` : '/static/images/no-image.jpg';
        div.innerHTML = `<img src="${imagePath}" alt="${name}" onerror="this.src='/static/images/no-image.jpg';"><div class="info"><h3>${name}</h3><p>${priceText}</p><p>${description || ''}</p></div><div class="actions"><div class="quantity-selector"><button class="quantity-btn minus-btn" type="button">-</button><input type="number" class="quantity-input" value="1" min="1"><button class="quantity-btn plus-btn" type="button">+</button></div><button class="add-to-cart-btn" type="button">${addToCartText}</button></div>`;
        return div;
    }

    function filterMenuByCategory(category) {
        if (!menuContainer) return;
        menuContainer.querySelectorAll('.menu-item').forEach(item => {
            const itemCategories = item.dataset.category.split(' ');
            item.style.display = category === 'all' || itemCategories.includes(category) ? 'flex' : 'none';
        });
    }

    async function handleSendOrder() {
        const items = Object.keys(cart).map(name => ({ name, quantity: cart[name].quantity }));
        if (items.length === 0) return;
        try {
            confirmOrderBtn.disabled = true;
            confirmOrderBtn.textContent = '注文中...';
            const response = await fetch(`${API_BASE_URL}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableId: currentTableId, accessToken: currentAccessToken, items })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `サーバーで問題が発生しました (ステータス: ${response.status})` }));
                throw new Error(errorData.message || '不明な注文エラーです。');
            }
            await response.json();
            cart = {};
            modalOverlay.classList.add('hidden');
            updateCartAndTotals();
            await refreshOrderHistory();
        } catch (error) {
            alert(`注文エラー: ${error.message}`);
        } finally {
            confirmOrderBtn.disabled = false;
            updateUILanguage();
        }
    }

    async function handleCallStaff(isCheckout = false) {
        const callType = isCheckout ? 'checkout' : 'normal';
        try {
            const res = await fetch(`${API_BASE_URL}/call`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ tableId: currentTableId, token: currentAccessToken, call_type: callType }) 
            });
            if (res.ok) {
                alert(isCheckout ? 'お会計のためにスタッフを呼び出しました。テーブルにてお待ちください。' : 'スタッフを呼び出しました。少々お待ちください。');
                return true;
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`エラー: ${err.message || '不明なエラー'}`);
                return false;
            }
        } catch (error) {
            alert('呼び出しに失敗しました。ネットワーク接続などを確認してください。');
            return false;
        }
    }
    
    function setupSession() {
        const params = new URLSearchParams(window.location.search);
        const tableId = params.get('table');
        const token = params.get('token');
        if (tableId && token) {
            currentTableId = parseInt(tableId, 10);
            currentAccessToken = token;
            if (tableNumberValue) {
                tableNumberValue.textContent = currentTableId;
            }
            return true;
        } else {
            document.body.innerHTML = '<h1>不正なアクセス</h1><p>テーブルのQRコードから再度アクセスしてください。</p>';
            document.body.style.padding = '20px';
            return false;
        }
    }
    
    function updateUILanguage() {
        const lang = currentLanguage;
        const tr = translations[lang];
        if (storeNameDisplay) storeNameDisplay.textContent = storeInfo.name;
        if (tableLabel) tableLabel.textContent = tr.table + ':';
        if (tableNumberValue) tableNumberValue.textContent = currentTableId;
        checkoutRequestBtn.textContent = tr.checkout;
        callStaffBtn.textContent = tr.call_staff;
        cartHeader.textContent = tr.order_list;
        document.getElementById('cart-title').textContent = tr.cart_title;
        document.getElementById('cart-total-label').textContent = tr.cart_total;
        showModalBtn.textContent = tr.confirm_order_btn;
        document.getElementById('modal-title').textContent = tr.modal_title;
        document.getElementById('modal-total-label').textContent = tr.modal_total_label;
        closeModalBtn.textContent = tr.modal_back_btn;
        confirmOrderBtn.textContent = tr.modal_confirm_btn;
        document.getElementById('history-modal-title').textContent = tr.history_title;
        document.getElementById('history-modal-desc').textContent = tr.history_desc;
        document.getElementById('history-total-label').textContent = tr.history_total_label;
        document.getElementById('history-modal-note').textContent = tr.history_note;
        closeHistoryModalBtn.textContent = tr.history_close_btn;
        confirmCheckoutBtn.textContent = tr.history_checkout_btn;
        const activeCategory = tabContainer.querySelector('.tab-btn.active')?.dataset.category || 'all';
        renderCategoryTabs(allCategoriesData); 
        const newActiveTab = tabContainer.querySelector(`.tab-btn[data-category="${activeCategory}"]`);
        if(newActiveTab) {
            tabContainer.querySelector('.tab-btn.active')?.classList.remove('active');
            newActiveTab.classList.add('active');
        }
        renderMenuItems(allProductsData);
        filterMenuByCategory(activeCategory);
        updateCartAndTotals();
        updateModalCart();
    }

    function setupEventListeners() {
        document.body.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.matches('.language-switcher button')) {
                const selectedLang = target.dataset.lang;
                if (selectedLang !== currentLanguage) {
                    currentLanguage = selectedLang;
                    document.querySelector('.language-switcher button.active').classList.remove('active');
                    target.classList.add('active');
                    updateUILanguage();
                }
                return;
            }
            const menuItem = target.closest('.menu-item:not(.sold-out)');
            const cartItemControls = target.closest('.item-controls');
            if (target.matches('.category-tabs .tab-btn')) {
                const category = target.dataset.category;
                if (tabContainer) {
                    tabContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    target.classList.add('active');
                }
                filterMenuByCategory(category);
            }
            else if (menuItem) {
                const input = menuItem.querySelector('.quantity-input');
                if (target.matches('.plus-btn')) { input.value = parseInt(input.value) + 1; }
                if (target.matches('.minus-btn') && parseInt(input.value) > 1) { input.value = parseInt(input.value) - 1; }
                if (target.matches('.add-to-cart-btn')) {
                    const name_jp = menuItem.dataset.name;
                    const price = parseInt(menuItem.dataset.price);
                    const quantity = parseInt(input.value);
                    if (cart[name_jp]) { cart[name_jp].quantity += quantity; } else { cart[name_jp] = { price, quantity }; }
                    updateCartAndTotals();
                    input.value = 1;
                    if (cartElement?.classList.contains('collapsed')) { cartElement.classList.remove('collapsed'); }
                    target.classList.add('clicked'); setTimeout(() => target.classList.remove('clicked'), 400);
                }
            }
            else if (cartItemControls) {
                const name_jp = target.dataset.name;
                if (!name_jp) return;
                if (target.matches('.sidebar-plus-btn') || target.matches('.modal-plus-btn')) { if (cart[name_jp]) cart[name_jp].quantity++; }
                if (target.matches('.sidebar-minus-btn') || target.matches('.modal-minus-btn')) { if (cart[name_jp] && cart[name_jp].quantity > 1) { cart[name_jp].quantity--; } else { delete cart[name_jp]; } }
                if (target.matches('.sidebar-delete-btn') || target.matches('.modal-delete-btn')) { delete cart[name_jp]; }
                updateCartAndTotals();
                if (modalOverlay && !modalOverlay.classList.contains('hidden')) updateModalCart();
            }
            else if (target === callStaffBtn) { await handleCallStaff(false); }
            else if (target === confirmOrderBtn) { handleSendOrder(); }
            else if (target === cartHeader || cartHeader?.contains(target)) { cartElement?.classList.toggle('collapsed'); }
            else if (target === showModalBtn) { if (Object.keys(cart).length) { updateModalCart(); modalOverlay.classList.remove('hidden'); } }
            else if (target === closeModalBtn || target === modalOverlay) { modalOverlay.classList.add('hidden'); }
            else if (target === checkoutRequestBtn) { openHistoryModal(); }
            else if (target === closeHistoryModalBtn || target === historyModalOverlay) { historyModalOverlay.classList.add('hidden'); }
            else if (target === confirmCheckoutBtn) {
                const success = await handleCallStaff(true);
                if(success) {
                    historyModalOverlay.classList.add('hidden');
                }
            }
        });
    }

    async function startApp() {
        if (setupSession()) {
            await showOpeningScreen();
            try {
                const res = await fetch(`${API_BASE_URL}/get_public_store_info`);
                if (res.ok) {
                    const data = await res.json();
                    if(data.store_name) { storeInfo.name = data.store_name; }
                }
            } catch (e) {
                console.error("店舗情報の取得に失敗:", e);
            }
            setupEventListeners();
            await initializeMenu();
            await refreshOrderHistory();
            updateUILanguage(); 
            setInterval(refreshOrderHistory, 10000); 
        }
    }

    startApp();
});