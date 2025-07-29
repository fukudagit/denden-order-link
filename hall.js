// hall.js (最終版・全システム終了機能付き)

document.addEventListener('DOMContentLoaded', () => {
    // ★★★ 管理者からのシステム終了通知を監視 ★★★
    window.addEventListener('storage', (event) => {
        // システム終了リクエストが来たら、即座にログアウト
        if (event.key === 'system_shutdown_request') {
            localStorage.removeItem('staff_token');
            alert('管理者によってシステムが終了されました。ログイン画面に戻ります。');
            window.location.href = '/login.html';
            return; // これ以降の処理は不要
        }

        // 会計完了通知が来たら、該当テーブルのクリアボタンを点滅させる
        if (event.key === 'last_checked_out_table' && event.newValue) {
            try {
                const { tableId } = JSON.parse(event.newValue);
                if (tableId) {
                    const clearBtn = document.querySelector(`.table-card-item[data-table-id='${tableId}'] .clear-table-btn`);
                    if (clearBtn) clearBtn.classList.add('blinking');
                    const callCardToRemove = document.querySelector(`.call-card button[data-table-id='${tableId}']`)?.closest('.call-card');
                    if (callCardToRemove) callCardToRemove.remove();
                }
            } catch (e) {
                console.error("localStorageの通知データの解析に失敗しました:", e);
            }
        }
    });

    const token = localStorage.getItem('staff_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const API_BASE_URL = 'https://my-order-link.onrender.com/api';

    document.querySelector('head').innerHTML += '<link rel="stylesheet" href="hall.css">';
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <header><h1>ホールスタッフ用画面</h1></header>
        <main>
            <div class="section table-management-section">
                <h2>テーブル管理</h2>
                <div class="add-table-controls">
                    <input type="number" id="table-number-input" placeholder="テーブル番号" min="1">
                    <button id="add-table-btn" type="button">テーブルを追加</button>
                </div>
                <div id="table-cards-container"></div>
            </div>
            <div class="section">
                <h2>呼び出し中 📞</h2>
                <div id="call-list-container"><p style="color: #555;">現在、呼び出しはありません。</p></div>
            </div>
            <div class="section order-section">
                <h2>ホール状況</h2>
                <div class="columns-container">
                    <div class="column">
                        <h3>調理中リスト 🍳</h3>
                        <div id="cooking-list"></div>
                    </div>
                    <div class="column">
                        <h3>提供待ちリスト 🔔</h3>
                        <div id="ready-list"></div>
                    </div>
                    <div class="column">
                        <h3>配膳済みリスト (会計待ち) ✔️</h3>
                        <div id="served-list"></div>
                    </div>
                </div>
            </div>
        </main>
        <div id="qr-modal-overlay" class="hidden">
            <div id="qr-modal-content">
                <h3 id="qr-modal-title">テーブル用QRコード</h3>
                <div id="qrcode"></div>
                <button id="close-qr-modal-btn" type="button">閉じる</button>
            </div>
        </div>
    `;
    
    const cookingListDiv = document.getElementById('cooking-list');
    const readyListDiv = document.getElementById('ready-list');
    const servedListDiv = document.getElementById('served-list');
    const callListContainer = document.getElementById('call-list-container');
    const tableNumberInput = document.getElementById('table-number-input');
    const addTableBtn = document.getElementById('add-table-btn');
    const tableCardsContainer = document.getElementById('table-cards-container');
    const qrModalOverlay = document.getElementById('qr-modal-overlay');
    const qrModalTitle = document.getElementById('qr-modal-title');
    const qrCodeContainer = document.getElementById('qrcode');
    const closeQrModalBtn = document.getElementById('close-qr-modal-btn');

    const tableStates = {};

    if (!cookingListDiv || !readyListDiv || !servedListDiv || !callListContainer || !tableNumberInput || !addTableBtn || !tableCardsContainer || !qrModalOverlay) {
        console.error("ホール画面の必須HTML要素が見つかりません。IDが正しいか確認してください。");
        return;
    }
    
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

    async function refreshHallView() {
        try {
            const [ordersRes, callsRes] = await Promise.all([
                authenticatedFetch(`${API_BASE_URL}/get_all_active_orders`),
                authenticatedFetch(`${API_BASE_URL}/get_calls`)
            ]);
            if (!ordersRes || !callsRes || !ordersRes.ok || !callsRes.ok) {
                console.error("APIからのデータ取得に失敗しました。");
                return;
            }

            const orders = await ordersRes.json();
            const calls = await callsRes.json(); 

            const normalCalls = calls.filter(c => c.call_type === 'normal');
            const checkoutCallingTableIds = new Set(
                calls.filter(c => c.call_type === 'checkout').map(c => c.table_id)
            );

            cookingListDiv.innerHTML = '';
            readyListDiv.innerHTML = '';
            servedListDiv.innerHTML = '';
            callListContainer.innerHTML = '';
            
            if (normalCalls.length > 0) {
                normalCalls.forEach(call => {
                    const callCard = document.createElement('div');
                    callCard.className = 'call-card';
                    callCard.innerHTML = `<h3>テーブル ${call.table_id}</h3><button class="resolve-call-btn" data-table-id="${call.table_id}" type="button">対応済み</button>`;
                    callListContainer.appendChild(callCard);
                });
            } else {
                 callListContainer.innerHTML = '<p style="color: #555;">現在、呼び出しはありません。</p>';
            }

            const tablesData = {};
            orders.forEach(order => {
                const tableId = order.table_id;
                if (!tablesData[tableId]) tablesData[tableId] = { cooking: [], ready: [], served: [] };
                order.items.forEach(item => {
                    if (item.item_status === 'cooking') tablesData[tableId].cooking.push(item);
                    else if (item.item_status === 'ready') tablesData[tableId].ready.push(item);
                    else if (item.item_status === 'served') tablesData[tableId].served.push(item);
                });
            });

            Object.keys(tablesData).forEach(tableIdStr => {
                const tableId = parseInt(tableIdStr, 10);
                const data = tablesData[tableId];
                const isCallingForCheckout = checkoutCallingTableIds.has(tableId);

                if (data.cooking.length > 0) cookingListDiv.appendChild(createOrderGroup(tableId, data.cooking, 'cooking', false));
                if (data.ready.length > 0) readyListDiv.appendChild(createOrderGroup(tableId, data.ready, 'ready', false));
                if (data.served.length > 0) servedListDiv.appendChild(createOrderGroup(tableId, data.served, 'served', isCallingForCheckout));
            });
            
            if (cookingListDiv.children.length === 0) cookingListDiv.innerHTML = '<p>現在、調理中の注文はありません。</p>';
            if (readyListDiv.children.length === 0) readyListDiv.innerHTML = '<p>現在、提供待ちの注文はありません。</p>';
            if (servedListDiv.children.length === 0) servedListDiv.innerHTML = '<p>現在、会計待ちのテーブルはありません。</p>';

        } catch (e) {
            console.error("ホール状況の更新中に致命的なエラーが発生:", e);
        }
    }
    
    function createOrderGroup(tableId, items, type, isCalling = false) {
        const group = document.createElement('div');
        group.className = 'order-group';
        group.classList.add(`type-${type}`);
        
        if (isCalling) {
            group.classList.add('is-calling');
        }
        
        const header = document.createElement('div');
        header.className = 'order-group-header';
        const span = document.createElement('span');
        span.textContent = `テーブル ${tableId}`;
        header.appendChild(span);

        if (isCalling) {
            header.innerHTML += `<button class="resolve-call-btn" data-table-id="${tableId}">呼び出し対応</button>`;
        }
        
        group.appendChild(header);
        items.forEach(item => {
            let card;
            if (type === 'cooking') card = createCookingItemCard(item);
            else if (type === 'ready') card = createReadyItemCard(item);
            else card = createServedItemCard(item);
            group.appendChild(card);
        });
        return group;
    }

    function createItemCardElement(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.itemId = item.id;
        const details = document.createElement('div');
        details.className = 'item-details';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.item_name;
        details.appendChild(nameSpan);
        details.append(` (数量: ${item.quantity})`);
        card.appendChild(details);
        return card;
    }

    function createCookingItemCard(item) {
        const card = createItemCardElement(item);
        const controls = document.createElement('div');
        controls.className = 'item-controls';
        controls.innerHTML = `
            <button type="button" class="quantity-change-btn" data-item-id="${item.id}" data-change="-1">-</button>
            <button type="button" class="quantity-change-btn" data-item-id="${item.id}" data-change="1">+</button>
            <button type="button" class="cancel-btn" data-item-id="${item.id}" title="キャンセル">🗑️</button>`;
        card.appendChild(controls);
        return card;
    }

    function createReadyItemCard(item) {
        const card = createItemCardElement(item);
        const controls = document.createElement('div');
        controls.className = 'item-controls';
        controls.innerHTML = `<button type="button" class="serve-btn" data-item-id="${item.id}">配膳完了</button>`;
        card.appendChild(controls);
        return card;
    }
    
    function createServedItemCard(item) {
        return createItemCardElement(item);
    }
    
    function createTableCard(tableId, orderUrl) {
        if (document.querySelector(`.table-card-item[data-table-id='${tableId}']`)) return null;
        const card = document.createElement('div');
        card.className = 'table-card-item';
        card.dataset.tableId = tableId;
        card.innerHTML = `<div class="card-header"><h3>テーブル ${tableId}</h3></div><div class="table-card-actions"><button class="action-btn clear-table-btn" type="button">テーブルクリア</button><button class="action-btn qr-show-btn" type="button">QR表示</button><a href="${orderUrl}" class="action-btn proxy-order-btn" target="_blank" rel="noopener noreferrer">代行注文</a></div>`;
        card.querySelector('.qr-show-btn').addEventListener('click', () => {
            qrModalTitle.textContent = `テーブル ${tableId} 用QRコード`;
            qrCodeContainer.innerHTML = '';
            new QRCode(qrCodeContainer, { text: orderUrl, width: 256, height: 256 });
            qrModalOverlay.classList.remove('hidden');
        });
        card.querySelector('.clear-table-btn').addEventListener('click', (event) => {
            event.stopPropagation();
            if (confirm(`テーブル ${tableId} のカードを画面から消しますか？\n(この操作は元に戻せません)`)) {
                delete tableStates[tableId];
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 300);
            }
        });
        return card;
    }
    function setupEventListeners() {
        addTableBtn.addEventListener('click', async () => {
            const tableId = tableNumberInput.value;
            if (!tableId || tableId < 1) return alert('有効なテーブル番号を入力してください。');
            if (tableStates[tableId]) return alert(`テーブル ${tableId} は既に追加されています。`);
            try {
                const res = await authenticatedFetch(`${API_BASE_URL}/generate_table_token/${tableId}`, { method: 'POST' });
                if (!res) return;
                const data = await res.json();
                if (res.ok && data.status === 'success') {
                    const orderUrl = `${window.location.origin}/index.html?table=${data.tableId}&token=${data.accessToken}`;
                    tableStates[tableId] = { accessToken: data.accessToken, orderUrl: orderUrl };
                    const newCard = createTableCard(tableId, orderUrl);
                    if (newCard) tableCardsContainer.appendChild(newCard);
                    tableNumberInput.value = '';
                } else {
                    alert(`トークンの発行に失敗: ${data.message}`);
                }
            } catch (error) {
                console.error("トークン発行エラー:", error);
                alert('サーバーとの通信に失敗しました。');
            }
        });

        document.body.addEventListener('click', async (event) => {
            const target = event.target;
            if (target.classList.contains('resolve-call-btn')) {
                const tableId = target.dataset.tableId;
                if (!tableId || !confirm(`テーブル ${tableId} の呼び出しに対応しましたか？`)) return;
                try {
                    const res = await authenticatedFetch(`${API_BASE_URL}/resolve_call/${tableId}`, { method: 'POST' });
                    if (res && res.ok) refreshHallView();
                } catch (e) {
                    console.error(e);
                    alert('通信エラーが発生しました。');
                }
                return;
            }
            if (target.classList.contains('clear-table-btn') && target.classList.contains('blinking')) {
                target.classList.remove('blinking');
            }
            const itemId = target.dataset.itemId;
            if (!itemId) return;
            let url, body, needsRefresh = false;
            if (target.classList.contains('quantity-change-btn')) {
                const currentQuantity = parseInt(target.closest('.item-card').querySelector('.item-details').textContent.match(/数量: (\d+)/)[1]);
                const change = parseInt(target.dataset.change);
                const newQuantity = currentQuantity + change;
                if (newQuantity > 0) {
                    url = `/update_item_quantity/${itemId}`; body = { quantity: newQuantity }; needsRefresh = true;
                } else if (confirm('数量が0になります。商品をキャンセルしますか？')) {
                    url = `/cancel_item/${itemId}`; needsRefresh = true;
                }
            } else if (target.classList.contains('cancel-btn')) {
                if (confirm('この商品を本当にキャンセルしますか？')) {
                    url = `/cancel_item/${itemId}`; needsRefresh = true;
                }
            } else if (target.classList.contains('serve-btn')) {
                url = `/update_item_status/${itemId}`; body = { status: 'served' }; needsRefresh = true;
            }
            if (needsRefresh) {
                try {
                    const res = await authenticatedFetch(`${API_BASE_URL}${url}`, { method: 'POST', body: body ? JSON.stringify(body) : null });
                    if (res && res.ok) {
                        refreshHallView();
                    } else {
                        const errText = await res.text();
                        try {
                            alert(`操作失敗: ${JSON.parse(errText).message}`);
                        } catch {
                            alert(`操作失敗: ${errText}`);
                        }
                    }
                } catch (e) {
                    console.error("アイテム操作APIエラー:", e);
                    alert('通信エラーが発生しました。');
                }
            }
        });
        closeQrModalBtn.addEventListener('click', () => qrModalOverlay.classList.add('hidden'));
        qrModalOverlay.addEventListener('click', (event) => {
            if (event.target === qrModalOverlay) qrModalOverlay.classList.add('hidden');
        });
    }

    // 初期化と定期更新
    setupEventListeners();
    setInterval(refreshHallView, 3000); 
    refreshHallView();
});