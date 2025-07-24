// admin.js (修正済み・全体)

document.addEventListener('DOMContentLoaded', () => {
    const STAFF_TOKEN = localStorage.getItem('staff_token');
    if (!STAFF_TOKEN) {
        alert('スタッフまたは管理者としてログインしていません。ログイン画面に戻ります。');
        window.location.href = '/login.html';
        return;
    }

    // ★★★ ここを本番環境のURLに修正しました ★★★
    const API_BASE_URL = 'https://my-order-link.onrender.com/api';
    
    const adminCategoryTabs = document.getElementById('admin-category-tabs');
    const productsTableBody = document.querySelector('#products-table tbody');
    const uploadBtn = document.getElementById('upload-btn');
    const menuFileInput = document.getElementById('menu-file-input');
    const addProductForm = document.getElementById('add-product-form');
    const downloadBtn = document.getElementById('download-btn');
    const editModalOverlay = document.getElementById('edit-modal-overlay');
    const editForm = document.getElementById('edit-product-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editIdInput = document.getElementById('edit-id');
    const newImageFileInput = document.getElementById('new-image-file');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const fetchSalesBtn = document.getElementById('fetch-sales-btn');
    const salesTable = document.getElementById('sales-table');
    const salesTableBody = salesTable.querySelector('tbody');
    const salesSummaryTable = document.getElementById('sales-summary-table');
    const salesSummaryTableBody = salesSummaryTable.querySelector('tbody');
    const sessionDurationTable = document.getElementById('session-duration-table');
    const sessionDurationTableBody = sessionDurationTable.querySelector('tbody');
    const salesSummaryDiv = document.getElementById('sales-summary');
    const sortByTimeBtn = document.getElementById('sort-by-time');
    const sortByTableBtn = document.getElementById('sort-by-table');
    const sortByProductBtn = document.getElementById('sort-by-product');
    const sortByDurationBtn = document.getElementById('sort-by-duration');
    const passwordChangeForm = document.getElementById('password-change-form');
    const openingSettingsForm = document.getElementById('opening-settings-form');
    const openingMessageInput = document.getElementById('opening-message');
    const openingImageFileInput1 = document.getElementById('opening-image-file-1');
    const currentOpeningImage1 = document.getElementById('current-opening-image-1');
    const deleteImageBtn1 = document.getElementById('delete-image-btn-1');
    const openingImageFileInput2 = document.getElementById('opening-image-file-2');
    const currentOpeningImage2 = document.getElementById('current-opening-image-2');
    const deleteImageBtn2 = document.getElementById('delete-image-btn-2');
    const openingEffectSelect = document.getElementById('opening-effect');
    const openingDurationInput = document.getElementById('opening-duration');
    const storeInfoForm = document.getElementById('store-info-form');
    const storeNameInput = document.getElementById('store-name');
    const storeAddressInput = document.getElementById('store-address');
    const storeTelInput = document.getElementById('store-tel');
    const storeReceiptNoteInput = document.getElementById('store-receipt-note');
    const storeQrCodeFileInput = document.getElementById('store-qr-code-file');
    const currentQrCodeImage = document.getElementById('current-qr-code-image');
    const deleteQrCodeBtn = document.getElementById('delete-qr-code-btn');
    const categoriesTableBody = document.querySelector('#categories-table tbody');
    const addCategoryForm = document.getElementById('add-category-form');
    const editCategoryModalOverlay = document.getElementById('edit-category-modal-overlay');
    const editCategoryForm = document.getElementById('edit-category-form');
    const cancelCategoryBtn = document.getElementById('cancel-category-btn');
    const newCategoryContainer = document.getElementById('new-product-category-container');
    const editCategoryContainer = document.getElementById('edit-product-category-container');

    let allProducts = [], allCategories = [], salesData = [], sessionData = [], cookingTimeData = {};
    let currentSort = 'time';

    async function authenticatedAPIFetch(url, options = {}) {
        const headers = { 
            'Authorization': `Bearer ${STAFF_TOKEN}`,
            ...options.headers 
        };
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('staff_token');
            alert('認証エラーまたは権限がありません。再度ログインしてください。');
            window.location.href = '/login.html';
            throw new Error('認証エラー');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message);
        }
        return response;
    }
    
    async function loadCategories() {
        try {
            const response = await authenticatedAPIFetch(`${API_BASE_URL}/admin/get_categories`);
            allCategories = await response.json();
            categoriesTableBody.innerHTML = '';
            allCategories.forEach(cat => {
                const tr = categoriesTableBody.insertRow();
                tr.insertCell().textContent = cat.id;
                tr.insertCell().textContent = cat.display_order;
                tr.insertCell().textContent = cat.name_jp;
                tr.insertCell().textContent = cat.name_en || '';
                tr.insertCell().innerHTML = `<button class="action-btn edit-btn" data-id="${cat.id}">修正</button><button class="delete-btn" data-id="${cat.id}" title="削除">🗑️</button>`;
            });
            updateCategoryCheckboxes();
            renderAdminCategoryTabs();
        } catch (error) {
            if (error.message !== '認証エラー') {
               alert(`カテゴリーの読み込みに失敗: ${error.message}`);
            }
        }
    }

    function renderAdminCategoryTabs() {
        adminCategoryTabs.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.textContent = 'すべて';
        allBtn.className = 'active';
        allBtn.dataset.categoryId = 'all';
        adminCategoryTabs.appendChild(allBtn);

        allCategories.forEach(cat => {
            const catBtn = document.createElement('button');
            catBtn.textContent = cat.name_jp;
            catBtn.dataset.categoryId = cat.id;
            adminCategoryTabs.appendChild(catBtn);
        });
    }

    function filterAdminProductsByCategory(selectedCategoryId) {
        productsTableBody.querySelectorAll('tr').forEach(tr => {
            if (selectedCategoryId === 'all') {
                tr.style.display = '';
            } else {
                const categoryIds = tr.dataset.categoryIds.split(',');
                tr.style.display = categoryIds.includes(selectedCategoryId) ? '' : 'none';
            }
        });
    }

    function updateCategoryCheckboxes() {
        const createCheckbox = (cat, formName) => `
            <div class="checkbox-item">
                <label for="cat-${formName}-${cat.id}">
                    <input type="checkbox" id="cat-${formName}-${cat.id}" name="${formName}_category_ids" value="${cat.id}">
                    ${cat.name_jp}
                </label>
            </div>
        `;
        
        newCategoryContainer.innerHTML = allCategories.map(cat => createCheckbox(cat, 'new')).join('');
        editCategoryContainer.innerHTML = allCategories.map(cat => createCheckbox(cat, 'edit')).join('');
    }

    function openEditCategoryModal(catId) {
        const catToEdit = allCategories.find(c => c.id === catId);
        if(!catToEdit) return;
        document.getElementById('edit-category-id').value = catToEdit.id;
        document.getElementById('edit-category-jp').value = catToEdit.name_jp;
        document.getElementById('edit-category-en').value = catToEdit.name_en || '';
        editCategoryModalOverlay.classList.remove('hidden');
    }

    function closeEditCategoryModal() {
        editCategoryModalOverlay.classList.add('hidden');
        editCategoryForm.reset();
    }

    async function loadProducts() {
        try {
            // ★★★ ここは認証不要なAPIなのでAPI_BASE_URLを直接使わない ★★★
            const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/get_products`);
            allProducts = await response.json();
            productsTableBody.innerHTML = '';
            allProducts.forEach(product => {
                const tr = productsTableBody.insertRow();
                tr.dataset.productId = product.id;
                tr.dataset.categoryIds = (product.categories || []).map(c => c.id).join(',');
                tr.insertCell().textContent = product.id;
                tr.insertCell().textContent = product.name;
                tr.insertCell().textContent = product.price.toLocaleString();
                const categoryNames = (product.categories || []).map(c => c.name_jp).join(', ');
                tr.insertCell().textContent = categoryNames || 'なし';
                
                const soldOutBtnText = product.is_sold_out ? '販売再開' : '品切れ';
                const soldOutBtnClass = product.is_sold_out ? 'action-btn in-stock-btn' : 'action-btn sold-out-btn';
                const statusCell = tr.insertCell();
                statusCell.innerHTML = `<button class="${soldOutBtnClass}" data-id="${product.id}" data-current-state="${product.is_sold_out}">${soldOutBtnText}</button>`;
                const actionCell = tr.insertCell();
                actionCell.innerHTML = `<button class="action-btn edit-btn" data-id="${product.id}">修正</button><button class="delete-btn" data-id="${product.id}" title="削除">🗑️</button>`;
            });
            filterAdminProductsByCategory('all');
        } catch (error) {
            console.error('メニューの読み込みに失敗:', error);
        }
    }
    
    async function loadOpeningSettings() {
        try {
            // ★★★ ここも認証不要なAPI ★★★
            const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/get_opening_settings`);
            const settings = await response.json();
            openingMessageInput.value = settings.opening_message || '';
            document.querySelector(`input[name="writing_mode"][value="${settings.opening_writing_mode || 'horizontal-tb'}"]`).checked = true;
            openingEffectSelect.value = settings.opening_effect || 'fade';
            openingDurationInput.value = settings.opening_duration || '5';
            const setupImage = (img, btn, url) => {
                img.style.display = url ? 'block' : 'none';
                img.src = url ? `${url}?t=${new Date().getTime()}` : '';
                btn.classList.toggle('hidden', !url);
            };
            setupImage(currentOpeningImage1, deleteImageBtn1, settings.opening_image_url);
            setupImage(currentOpeningImage2, deleteImageBtn2, settings.opening_image_url_2);
        } catch (e) { console.error('オープニング設定読み込みエラー:', e); }
    }
    
    async function loadStoreInfo() {
        try {
            const response = await authenticatedAPIFetch(`${API_BASE_URL}/admin/get_store_info`);
            const data = await response.json();
            storeNameInput.value = data.store_name || '';
            storeAddressInput.value = data.store_address || '';
            storeTelInput.value = data.store_tel || '';
            storeReceiptNoteInput.value = data.store_receipt_note || '';
            if (data.store_qr_code_url) {
                currentQrCodeImage.src = `${data.store_qr_code_url}?t=${new Date().getTime()}`;
                currentQrCodeImage.style.display = 'block';
                deleteQrCodeBtn.classList.remove('hidden');
            } else {
                currentQrCodeImage.style.display = 'none';
                currentQrCodeImage.src = '';
                deleteQrCodeBtn.classList.add('hidden');
            }
        } catch (error) { console.error('店舗情報読み込みエラー:', error); }
    }

    // --- 省略: renderSalesData, updateSortButtons, openEditModal, closeEditModal などの変更のない関数 ---

    adminCategoryTabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const selectedCategoryId = e.target.dataset.categoryId;
            adminCategoryTabs.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            filterAdminProductsByCategory(selectedCategoryId);
        }
    });
    
    uploadBtn.addEventListener('click', async () => {
        const file = menuFileInput.files[0];
        if (!file) return alert('ファイルを選択してください。');
        if (!confirm('本当にアップロードしますか？既存のカテゴリーとメニューは全て上書きされます。')) return;
        const formData = new FormData();
        formData.append('menu_file', file);
        try {
            const response = await authenticatedAPIFetch(`${API_BASE_URL}/admin/upload_menu`, { method: 'POST', body: formData });
            const result = await response.json();
            alert(result.message);
            init();
            menuFileInput.value = '';
        } catch (error) {
            alert(`アップロードに失敗: ${error.message}`);
        }
    });
    
    // --- 省略: 他のイベントリスナー ---
    
    // 初期化処理
    async function init() {
        await loadCategories();
        await loadProducts();
        await loadOpeningSettings();
        await loadStoreInfo();
    }
    
    init();
    
    // --- ここから下に、変更のなかった他の関数やイベントリスナーのコードが続きます ---
    // (完全を期すため、元のファイルの残りの部分をここに貼り付けます)
    function openEditModal(productId) {
        const productToEdit = allProducts.find(p => p.id === productId);
        if (!productToEdit) return;
        editIdInput.value = productToEdit.id;
        document.getElementById('edit-name').value = productToEdit.name;
        document.getElementById('edit-price').value = productToEdit.price;
        document.getElementById('edit-description').value = productToEdit.description || '';
        document.getElementById('edit-image').value = productToEdit.image_path || '';
        document.getElementById('edit-name-en').value = productToEdit.name_en || '';
        document.getElementById('edit-description-en').value = productToEdit.description_en || '';

        const productCategoryIds = new Set((productToEdit.categories || []).map(c => c.id));
        editCategoryContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = productCategoryIds.has(parseInt(checkbox.value, 10));
        });

        editModalOverlay.classList.remove('hidden');
    }

    function closeEditModal() {
        editModalOverlay.classList.add('hidden');
        editForm.reset();
        editCategoryContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    function renderSalesData() {
        salesTableBody.innerHTML = '';
        salesSummaryTableBody.innerHTML = '';
        sessionDurationTableBody.innerHTML = '';
        salesSummaryDiv.innerHTML = '';
        salesTable.classList.add('hidden');
        salesSummaryTable.classList.add('hidden');
        sessionDurationTable.classList.add('hidden');

        if (currentSort === 'product') {
            salesSummaryTable.classList.remove('hidden');
            if(Object.keys(salesData).length === 0) {
                return salesSummaryTableBody.innerHTML = '<tr><td colspan="4">対象期間の売上データはありません。</td></tr>';
            }
            const productSummary = salesData.reduce((acc, item) => {
                if (!acc[item.item_name]) {
                    acc[item.item_name] = { quantity: 0, total: 0 };
                }
                acc[item.item_name].quantity += item.quantity;
                acc[item.item_name].total += item.price * item.quantity;
                return acc;
            }, {});
            const sortedSummary = Object.entries(productSummary).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
            sortedSummary.forEach(item => {
                const tr = salesSummaryTableBody.insertRow();
                tr.insertCell().textContent = item.name;
                tr.insertCell().textContent = item.quantity;
                tr.insertCell().textContent = item.total.toLocaleString();
                tr.insertCell().textContent = cookingTimeData[item.name] ? `${cookingTimeData[item.name]}分` : 'N/A';
            });
        } else if (currentSort === 'duration') {
            sessionDurationTable.classList.remove('hidden');
            if(sessionData.length === 0) {
                return sessionDurationTableBody.innerHTML = '<tr><td colspan="5">対象期間の滞在時間データはありません。</td></tr>';
            }
            sessionData.sort((a, b) => b.duration_minutes - a.duration_minutes).forEach(session => {
                const tr = sessionDurationTableBody.insertRow();
                tr.insertCell().textContent = session.table_id;
                tr.insertCell().textContent = new Date(session.start_time * 1000).toLocaleString('ja-JP');
                tr.insertCell().textContent = new Date(session.end_time * 1000).toLocaleString('ja-JP');
                tr.insertCell().textContent = session.duration_minutes;
                tr.insertCell().textContent = session.total_price.toLocaleString();
            });
        } else {
            salesTable.classList.remove('hidden');
             if(salesData.length === 0) {
                return salesTableBody.innerHTML = '<tr><td colspan="6">対象期間の売上データはありません。</td></tr>';
            }
            const sortedData = [...salesData].sort((a, b) => {
                if (currentSort === 'table') return a.table_id - b.table_id || a.created_at - b.created_at;
                return a.created_at - b.created_at;
            });
            sortedData.forEach(item => {
                const tr = salesTableBody.insertRow();
                tr.insertCell().textContent = new Date(item.created_at * 1000).toLocaleString('ja-JP');
                tr.insertCell().textContent = item.table_id;
                tr.insertCell().textContent = item.item_name;
                tr.insertCell().textContent = item.quantity;
                tr.insertCell().textContent = item.price.toLocaleString();
                tr.insertCell().textContent = (item.price * item.quantity).toLocaleString();
            });
        }
        const totalSales = salesData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (totalSales > 0) {
            salesSummaryDiv.innerHTML = `<span>合計売上: ${totalSales.toLocaleString()}円</span>`;
        }
    }

    function updateSortButtons() {
        [sortByTimeBtn, sortByTableBtn, sortByProductBtn, sortByDurationBtn].forEach(btn => btn.classList.remove('active'));
        document.getElementById(`sort-by-${currentSort}`).classList.add('active');
    }

    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name_jp = document.getElementById('new-category-jp').value;
        const name_en = document.getElementById('new-category-en').value;
        try {
            await authenticatedAPIFetch(`${API_BASE_URL}/admin/add_category`, { method: 'POST', body: JSON.stringify({ name_jp, name_en }) });
            addCategoryForm.reset();
            loadCategories();
        } catch (error) {
            alert(`カテゴリーの追加に失敗: ${error.message}`);
        }
    });
    categoriesTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const catId = parseInt(target.closest('[data-id]')?.dataset.id, 10);
        if (!catId) return;
        if (target.classList.contains('edit-btn')) {
            openEditCategoryModal(catId);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm(`ID: ${catId} のカテゴリーを本当に削除しますか？\n（このカテゴリーを使用中のメニューがあると削除できません）`)) {
                try {
                    await authenticatedAPIFetch(`${API_BASE_URL}/admin/delete_category/${catId}`, { method: 'POST' });
                    loadCategories();
                    loadProducts();
                } catch (error) {
                    alert(`削除に失敗: ${error.message}`);
                }
            }
        }
    });
    editCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-category-id').value;
        const name_jp = document.getElementById('edit-category-jp').value;
        const name_en = document.getElementById('edit-category-en').value;
        try {
            await authenticatedAPIFetch(`${API_BASE_URL}/admin/update_category/${id}`, { method: 'POST', body: JSON.stringify({ name_jp, name_en }) });
            closeEditCategoryModal();
            loadCategories();
            loadProducts();
        } catch (error) {
            alert(`更新に失敗: ${error.message}`);
        }
    });
    cancelCategoryBtn.addEventListener('click', closeEditCategoryModal);
    editCategoryModalOverlay.addEventListener('click', (e) => { if(e.target === editCategoryModalOverlay) closeEditCategoryModal(); });
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageFile = newImageFileInput.files[0];
        const selectedCategoryIds = Array.from(newCategoryContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selectedCategoryIds.length === 0) {
            return alert('カテゴリーを1つ以上選択してください。');
        }
        const formData = new FormData();
        formData.append('name', document.getElementById('new-name').value);
        formData.append('price', document.getElementById('new-price').value);
        formData.append('description', document.getElementById('new-description').value);
        if (imageFile) {
            formData.append('image_file', imageFile);
        }
        formData.append('name_en', document.getElementById('new-name-en').value);
        formData.append('description_en', document.getElementById('new-description-en').value);
        formData.append('category_ids', selectedCategoryIds.join(','));
        try {
            await authenticatedAPIFetch(`${API_BASE_URL}/admin/add_product`, { method: 'POST', body: formData });
            alert('メニューを追加しました。');
            addProductForm.reset();
            newCategoryContainer.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
            loadProducts();
        } catch (error) {
            alert(`追加に失敗: ${error.message}`);
        }
    });
    productsTableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button[data-id]');
        if (!button) return;
        const productId = parseInt(button.dataset.id, 10);
        if (button.classList.contains('edit-btn')) {
            openEditModal(productId);
        } else if (button.matches('.sold-out-btn, .in-stock-btn')) {
            const newState = button.dataset.currentState === '0' ? 1 : 0;
            try {
                await authenticatedAPIFetch(`${API_BASE_URL}/admin/update_product_status/${productId}`, { method: 'POST', body: JSON.stringify({ is_sold_out: newState }) });
                loadProducts();
            } catch (error) {
                alert(`状態更新に失敗: ${error.message}`);
            }
        } else if (button.classList.contains('delete-btn')) {
            if (confirm(`ID: ${productId} のメニューを本当に削除しますか？`)) {
                try {
                    await authenticatedAPIFetch(`${API_BASE_URL}/admin/delete_product/${productId}`, { method: 'POST' });
                    loadProducts();
                } catch (error) {
                    alert(`削除に失敗: ${error.message}`);
                }
            }
        }
    });
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = editIdInput.value;
        const selectedCategoryIds = Array.from(editCategoryContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const updatedProduct = {
            name: document.getElementById('edit-name').value,
            price: parseInt(document.getElementById('edit-price').value, 10),
            description: document.getElementById('edit-description').value,
            image_path: document.getElementById('edit-image').value,
            name_en: document.getElementById('edit-name-en').value,
            description_en: document.getElementById('edit-description-en').value,
            category_ids: selectedCategoryIds
        };
        try {
            await authenticatedAPIFetch(`${API_BASE_URL}/admin/update_product/${productId}`, { method: 'POST', body: JSON.stringify(updatedProduct) });
            alert('メニュー情報を更新しました。');
            closeEditModal();
            loadProducts();
        } catch (error) {
            alert(`更新に失敗: ${error.message}`);
        }
    });
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModalOverlay.addEventListener('click', (e) => { if (e.target === editModalOverlay) closeEditModal(); });
    downloadBtn.addEventListener('click', async () => {
        if (!confirm('現在のメニューとカテゴリー設定をExcelファイルとしてダウンロードしますか？')) return;
        try {
            const response = await authenticatedAPIFetch(`${API_BASE_URL}/admin/download_menu`);
            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'menu_backup.xlsx';
            if (disposition && disposition.includes('attachment')) {
                const match = /filename="([^"]+)"/.exec(disposition);
                if (match) filename = match[1];
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            alert(`ダウンロードに失敗: ${error.message}`);
        }
    });
    fetchSalesBtn.addEventListener('click', async () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (!startDate || !endDate) return alert('開始日と終了日を両方指定してください。');
        try {
            const [salesRes, durationRes, cookingTimeRes] = await Promise.all([
                authenticatedAPIFetch(`${API_BASE_URL}/admin/get_sales_data?start_date=${startDate}&end_date=${endDate}`),
                authenticatedAPIFetch(`${API_BASE_URL}/admin/get_session_durations?start_date=${startDate}&end_date=${endDate}`),
                authenticatedAPIFetch(`${API_BASE_URL}/admin/get_cooking_times?start_date=${startDate}&end_date=${endDate}`)
            ]);
            salesData = await salesRes.json();
            sessionData = await durationRes.json();
            cookingTimeData = await cookingTimeRes.json();
            renderSalesData();
        } catch (error) {
            alert(`データ取得エラー: ${error.message}`);
        }
    });
    sortByTimeBtn.addEventListener('click', () => { currentSort = 'time'; updateSortButtons(); renderSalesData(); });
    sortByTableBtn.addEventListener('click', () => { currentSort = 'table'; updateSortButtons(); renderSalesData(); });
    sortByProductBtn.addEventListener('click', () => { currentSort = 'product'; updateSortButtons(); renderSalesData(); });
    sortByDurationBtn.addEventListener('click', () => { currentSort = 'duration'; updateSortButtons(); renderSalesData(); });
    passwordChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetUser = passwordChangeForm.querySelector('input[name="target_user"]:checked').value;
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        if (newPassword !== confirmPassword) return alert('新しいパスワードが一致しません。');
        try {
            const response = await authenticatedAPIFetch(`${API_BASE_URL}/admin/change_password`, {
                method: 'POST',
                body: JSON.stringify({ username: targetUser, current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword })
            });
            const result = await response.json();
            alert(result.message);
            if(response.ok) passwordChangeForm.reset();
        } catch (error) {
            alert(`パスワード変更中にエラー: ${error.message}`);
        }
    });
    openingSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(openingSettingsForm);
        try {
            await authenticatedAPIFetch(`${API_BASE_URL}/admin/update_opening`, { method: 'POST', body: formData });
            alert('オープニング設定を更新しました。');
            loadOpeningSettings();
        } catch (error) {
            alert(`設定更新に失敗: ${error.message}`);
        }
    });
    storeInfoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(storeInfoForm);
        try {
            await authenticatedAPIFetch(`${API_BASE_URL}/admin/update_store_info`, { method: 'POST', body: formData });
            alert('店舗情報を更新しました。');
            storeQrCodeFileInput.value = '';
            loadStoreInfo();
        } catch (error) {
            alert(`店舗情報更新に失敗: ${error.message}`);
        }
    });
    deleteQrCodeBtn.addEventListener('click', async () => {
        if (!confirm('QRコード画像を削除しますか？')) return;
        try {
            await authenticatedAPIFetch(`${API_BASE_URL}/admin/delete_qr_code`, { method: 'POST' });
            alert('QRコードを削除しました。');
            loadStoreInfo();
        } catch (error) {
            alert(`削除に失敗: ${error.message}`);
        }
    });
    [deleteImageBtn1, deleteImageBtn2].forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const imageNumber = e.target.dataset.imageNumber;
            if (!confirm(`画像 ${imageNumber} を削除しますか？`)) return;
            try {
                await authenticatedAPIFetch(`${API_BASE_URL}/admin/delete_opening_image/${imageNumber}`, { method: 'POST' });
                alert(`画像 ${imageNumber} を削除しました。`);
                loadOpeningSettings();
            } catch (error) {
                alert(`削除に失敗: ${error.message}`);
            }
        });
    });
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', (event) => {
            const iconElement = event.currentTarget;
            const container = iconElement.closest('.password-container');
            if (container) {
                const passwordInput = container.querySelector('input');
                if (passwordInput) {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        iconElement.textContent = '🙈';
                    } else {
                        passwordInput.type = 'password';
                        iconElement.textContent = '👁️';
                    }
                }
            }
        });
    });
});