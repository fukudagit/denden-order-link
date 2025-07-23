document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('staff_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // CSSを動的に読み込み
    document.querySelector('head').innerHTML += '<link rel="stylesheet" href="kitchen.css">';
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <header><h1>厨房ディスプレイ (調理中リスト)</h1></header>
        <main id="kitchen-display"></main>
    `;

    const kitchenDisplay = document.getElementById('kitchen-display');
    if (!kitchenDisplay) return;

    const authHeaders = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    async function authenticatedFetch(url, options = {}) {
        const res = await fetch(url, { ...options, headers: { ...authHeaders, ...options.headers } });
        if (res.status === 401) {
            localStorage.removeItem('staff_token');
            alert('セッションが切れました。再度ログインしてください。');
            window.location.href = '/login.html';
            return null;
        }
        return res;
    }

    async function refreshKitchenView() {
        try {
            const response = await authenticatedFetch('http://127.0.0.1:5000/api/get_all_active_orders');
            if (!response || !response.ok) return;
            const orders = await response.json();
            
            const currentlyDisplayed = new Set([...kitchenDisplay.querySelectorAll('.item-card')].map(c => c.dataset.itemId));
            const incomingItems = new Set();

            orders.forEach(order => {
                order.items.forEach(item => {
                    if (item.item_status === 'cooking') {
                        incomingItems.add(item.id.toString());
                        if (!currentlyDisplayed.has(item.id.toString())) {
                            // 新しいカードを追加する前にプレースホルダーを削除
                            const placeholder = kitchenDisplay.querySelector('p');
                            if (placeholder) placeholder.remove();
                            kitchenDisplay.appendChild(createItemCard(order, item));
                        }
                    }
                });
            });

            currentlyDisplayed.forEach(id => {
                if (!incomingItems.has(id)) {
                    const card = document.querySelector(`.item-card[data-item-id='${id}']`);
                    if (card) card.remove();
                }
            });

            if(kitchenDisplay.children.length === 0) {
                 kitchenDisplay.innerHTML = '<p style="text-align: center; font-size: 1.2em; width: 100%;">現在、調理中の商品はありません。</p>';
            }

        } catch (error) { console.error('Kitchen refresh error:', error); }
    }

    function createItemCard(order, item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.itemId = item.id;
        card.innerHTML = `
            <div class="info">テーブル: ${order.table_id} <span>(注文ID:${order.id})</span></div>
            <div class="item-name">${item.item_name}</div>
            <div class="quantity">数量: ${item.quantity}</div>
            <button class="complete-btn" data-item-id="${item.id}">調理完了</button>
        `;
        return card;
    }

    kitchenDisplay.addEventListener('click', async (event) => {
        if (event.target.classList.contains('complete-btn')) {
            const itemId = event.target.dataset.itemId;
            if (!itemId) return;
            try {
                const response = await authenticatedFetch(`http://127.0.0.1:5000/api/update_item_status/${itemId}`, {
                    method: 'POST',
                    body: JSON.stringify({ status: 'ready' }),
                });
                if (response && response.ok) {
                    const cardToRemove = document.querySelector(`.item-card[data-item-id='${itemId}']`);
                    if (cardToRemove) {
                        cardToRemove.style.opacity = '0';
                        cardToRemove.style.transform = 'scale(0.8)';
                        setTimeout(() => cardToRemove.remove(), 500);
                    }
                }
            } catch (error) { console.error('Update status error:', error); }
        }
    });

    setInterval(refreshKitchenView, 3000);
    refreshKitchenView();
});