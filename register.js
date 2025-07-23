document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('staff_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <header><h1>レジ・会計システム</h1></header>
        <div class="main-container">
            <div class="tables-section">
                <h2>アクティブなテーブル（会計待ち）</h2>
                <div id="table-container"><p>読み込み中...</p></div>
            </div>
            <div class="history-section">
                <h2>会計済み履歴 (本日)</h2>
                <div id="paid-orders-history"><p>読み込み中...</p></div>
            </div>
        </div>
        <div id="print-modal-overlay" class="hidden">
            <div id="print-modal-content">
                <h3>印刷オプション</h3>
                <p id="print-modal-message"></p>
                <div class="print-modal-actions">
                    <button id="print-invoice-btn">請求書を印刷</button>
                    <button id="print-receipt-btn">領収書を印刷</button>
                </div>
                <button id="close-print-modal-btn">閉じる</button>
            </div>
        </div>
        <iframe id="print-frame" style="display:none;"></iframe>
    `;

    const tableContainer = document.getElementById('table-container');
    const paidOrdersHistory = document.getElementById('paid-orders-history');
    const printModalOverlay = document.getElementById('print-modal-overlay');
    const printModalMessage = document.getElementById('print-modal-message');
    const closePrintModalBtn = document.getElementById('close-print-modal-btn');

    let currentPrintingOrderId = null;
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    
    let blinkingTables = new Set();

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

    async function refreshRegisterView() {
        try {
            const [tablesRes, paidOrdersRes] = await Promise.all([
                authenticatedFetch('http://127.0.0.1:5000/api/get_table_summary'),
                authenticatedFetch('http://127.0.0.1:5000/api/get_paid_orders')
            ]);

            if (!tablesRes || !paidOrdersRes || !tablesRes.ok || !paidOrdersRes.ok) return;
            
            const tables = await tablesRes.json();
            const paidOrders = await paidOrdersRes.json();
            
            const checkoutCallingTableIds = new Set(
                tables.filter(t => t.call_type === 'checkout').map(t => t.table_id.toString())
            );
            blinkingTables = checkoutCallingTableIds;


            tableContainer.innerHTML = tables.length > 0 ? '' : '<p>現在、会計待ちのテーブルはありません。</p>';
            tables.forEach(tableData => {
                const tableIdStr = tableData.table_id.toString();
                const newCard = createTableCard(tableData);
                if (blinkingTables.has(tableIdStr)) {
                    newCard.classList.add('is-calling-for-checkout');
                }
                tableContainer.appendChild(newCard);
            });
            
            paidOrdersHistory.innerHTML = paidOrders.length > 0 ? '' : '<p>本日の会計済み履歴はありません。</p>';
            paidOrders.forEach(order => paidOrdersHistory.appendChild(createPaidCard(order)));
        } catch (e) { console.error("表示更新中にエラー:", e); }
    }

    function createTableCard(tableData) {
        const card = document.createElement('div');
        card.className = 'table-card';
        card.dataset.tableId = tableData.table_id;

        const allServed = tableData.orders.every(order => order.items.every(item => item.item_status === 'served'));
        if(allServed) {
            card.classList.add('all-served');
        }

        let itemsHtml = '<ul>';
        tableData.orders.forEach(order => {
            order.items.forEach(item => {
                let icon = item.item_status === 'cooking' ? '🍳' : (item.item_status === 'ready' ? '🔔' : '✔️');
                itemsHtml += `<li><span>${icon} ${item.item_name} x ${item.quantity}</span><span>${(item.price * item.quantity).toLocaleString()}円</span></li>`;
            });
        });
        itemsHtml += '</ul>';

        card.innerHTML = `
            <h2>テーブル ${tableData.table_id}</h2>
            <div class="order-details">${itemsHtml}</div>
            <div class="grand-total">合計: ${tableData.grand_total.toLocaleString()}円</div>
        `;
        
        if (allServed) {
            const btn = document.createElement('button');
            btn.className = 'checkout-btn';
            btn.dataset.tableId = tableData.table_id;
            btn.textContent = 'テーブル会計';
            card.appendChild(btn);
        }
        return card;
    }
    
    function createPaidCard(order) {
        const card = document.createElement('div');
        card.className = 'paid-card';
        const paidTime = order.paid_at ? new Date(order.paid_at * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '時刻不明';
        const totalPrice = order.total_price || 0;

        card.innerHTML = `
            <div class="paid-card-info">
                <strong>テーブル: ${order.table_id}</strong>
                <small>(${paidTime}) - ${totalPrice.toLocaleString()}円</small>
            </div>
            <button class="print-btn" data-order-id="${order.id}">印刷</button>
        `;
        return card;
    }

    async function handlePrint(type) {
        if (!currentPrintingOrderId) return;
        try {
            const res = await authenticatedFetch(`http://127.0.0.1:5000/api/get_order_for_print/${currentPrintingOrderId}`);
            if (!res || !res.ok) throw new Error('印刷データの取得に失敗しました。');
            
            const data = await res.json();
            const { order, items, store_info } = data;
            
            const now = new Date();
            const printTime = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

            let contentHtml = '';
            
            if (type === 'invoice') {
                let itemsHtml = '';
                items.forEach(item => {
                    itemsHtml += `
                        <tr>
                            <td>${item.item_name}</td>
                            <td class="col-qty">${item.quantity}</td>
                            <td class="col-price">${(item.price * item.quantity).toLocaleString()}</td>
                        </tr>`;
                });

                contentHtml = `
                    <table class="items-table">
                        <thead><tr><th>内容</th><th class="col-qty">数量</th><th class="col-price">金額</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <hr>
                    <section class="total-section">
                        <p>合計: ${Number(order.total_price).toLocaleString()} 円</p>
                    </section>
                `;
            } else {
                contentHtml = `
                    <section class="total-section">
                        <p>合計金額</p>
                        <p>${Number(order.total_price).toLocaleString()} 円</p>
                    </section>
                    <hr>
                    <section class="receipt-info">
                        <br><p>上記正に領収いたしました。</p>
                        <p>但し、お品代として</p>
                    </section>
                `;
            }

            const title = type === 'receipt' ? '領 収 書' : 'ご利用明細書';
            const receiptNumber = type === 'receipt' ? `<p>領収書No: ${String(order.id).padStart(6, '0')}</p>` : '';
            const toCustomer = type === 'receipt' 
                ? `<div class="customer-name-line"><span class="customer-name-field"></span><span>様</span></div>` 
                : `<p>テーブル: ${order.table_id} 様</p>`;
            
            const qrCodeHtml = store_info && store_info.store_qr_code_url
                ? `<div class="qr-code-section">
                       <p>よろしければレビューにご協力ください</p>
                       <img src="${store_info.store_qr_code_url}" alt="QR Code">
                   </div>` 
                : '';

            const printFrame = document.getElementById('print-frame');
            const doc = printFrame.contentWindow.document;

            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html lang="ja">
                    <head>
                        <meta charset="UTF-8">
                        <title>印刷</title>
                        <style>
                            body { margin: 0; padding: 0; background-color: #fff; font-family: 'MS Gothic', 'Osaka-mono', monospace; font-size: 10pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .receipt-container { width: 80mm; padding: 2mm; box-sizing: border-box; }
                            .store-info { text-align: center; padding-bottom: 5px; }
                            .store-info h1 { font-size: 14pt; margin: 10px 0 5px 0; }
                            .store-info p { margin: 2px 0; font-size: 9pt; }
                            hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
                            .receipt-info { text-align: left; }
                            .receipt-info h2 { text-align: center; margin: 10px 0; font-size: 14pt; font-weight: bold; }
                            .receipt-info p { margin: 3px 0; }
                            .items-table { width: 100%; margin-top: 10px; border-collapse: collapse; }
                            .items-table th, .items-table td { padding: 3px 0; text-align: left; vertical-align: top; }
                            .items-table th { border-bottom: 1px solid #000; }
                            .items-table .col-qty { text-align: right; padding-right: 5px; }
                            .items-table .col-price { text-align: right; }
                            .total-section { margin-top: 10px; text-align: right; font-size: 12pt; }
                            .total-section p { margin: 5px 0; }
                            .total-section p:last-child { font-size: 16pt; font-weight: bold; }
                            .receipt-note { margin-top: 15px; font-size: 9pt; }
                            .receipt-footer { margin-top: 20px; text-align: center; font-size: 9pt; }
                            .qr-code-section { margin: 10px auto; text-align: center; }
                            .qr-code-section p { margin: 0 0 5px 0; }
                            .qr-code-section img { max-width: 18mm; width: 100%; height: auto; }
                            .customer-name-line { display: flex; align-items: baseline; margin: 10px 0; font-size: 12pt; min-height: 1.5em; }
                            .customer-name-field { flex-grow: 1; border-bottom: 1px solid #000; padding-bottom: 2px; margin-right: 5px; }
                        </style>
                    </head>
                    <body>
                        <div class="receipt-container">
                            <header class="store-info">
                                <h1>${store_info.store_name || '店舗名なし'}</h1>
                                <p>${store_info.store_address || '住所なし'}</p>
                                <p>TEL: ${store_info.store_tel || '電話番号なし'}</p>
                            </header>
                            <hr>
                            <section class="receipt-info">
                                <h2>${title}</h2>
                                ${toCustomer}
                                <p>発行日時: ${printTime}</p>
                                ${receiptNumber}
                            </section>
                            <hr>
                            ${contentHtml}
                            <div class="receipt-note">
                                <p>${store_info.store_receipt_note || ''}</p>
                            </div>
                            <footer class="receipt-footer">
                                ${qrCodeHtml}
                                <p>ご来店ありがとうございました。</p>
                            </footer>
                        </div>
                    </body>
                </html>`);
            doc.close();
            
            setTimeout(() => {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            }, 500);

        } catch (error) {
            alert(error.message);
            console.error(error);
        } finally {
            printModalOverlay.classList.add('hidden');
        }
    }

    document.body.addEventListener('click', async (event) => {
        const target = event.target;
        
        if (target.classList.contains('checkout-btn')) {
            const tableId = target.dataset.tableId;
            if (!tableId || !confirm(`テーブル ${tableId} を会計しますか？`)) return;
            try {
                blinkingTables.delete(tableId);
                // ▼▼▼ 修正点: IPアドレスのタイポを修正 (1227 -> 127) ▼▼▼
                const res = await authenticatedFetch(`http://127.0.0.1:5000/api/checkout_table/${tableId}`, { method: 'POST' });
                // ▲▲▲ 修正ここまで ▲▲▲
                if (res && res.ok) {
                    localStorage.setItem('last_checked_out_table', JSON.stringify({
                        tableId: tableId,
                        timestamp: Date.now()
                    }));
                    await refreshRegisterView();
                } else {
                    alert('会計処理に失敗しました。');
                }
            } catch (e) { console.error(e); }
        }

        if (target.classList.contains('print-btn')) {
            currentPrintingOrderId = target.dataset.orderId;
            printModalMessage.textContent = `注文ID: ${currentPrintingOrderId} の印刷オプション`;
            printModalOverlay.classList.remove('hidden');
        }
        if (target.id === 'print-invoice-btn') handlePrint('invoice');
        if (target.id === 'print-receipt-btn') handlePrint('receipt');
    });
    
    closePrintModalBtn.addEventListener('click', () => {
        printModalOverlay.classList.add('hidden');
    });
    
    printModalOverlay.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {
            printModalOverlay.classList.add('hidden');
        }
    });

    setInterval(refreshRegisterView, 3000);
    refreshRegisterView();
});