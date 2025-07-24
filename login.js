document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    if (!loginForm || !usernameInput || !passwordInput || !errorMessage) {
        console.error('ログインフォームの必須要素が見つかりません。');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = ''; 

        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            // ★★★ ここがHTTPSになっていることを確認 ★★★
            const response = await fetch('https://my-order-link.onrender.com/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                if (data.role === 'admin') {
                    // 不要なキーは保存しない
                }
                localStorage.setItem('staff_token', data.token);

                showRoleSelection(data.role);
            } else {
                errorMessage.textContent = data.message || 'ログインに失敗しました。';
            }

        } catch (error) {
            console.error('ログイン処理中にエラー:', error);
            errorMessage.textContent = 'サーバーとの通信に失敗しました。';
        }
    });

    function showRoleSelection(role) {
        const container = document.querySelector('.login-container');
        let buttonsHtml = `
            <button onclick="window.location.href='/hall.html'">ホール画面</button>
            <button onclick="window.location.href='/kitchen.html'">厨房画面</button>
            <button onclick="window.location.href='/register.html'">レジ画面</button>
        `;

        if (role === 'admin') {
            buttonsHtml += `<button onclick="window.location.href='/admin.html'" style="background-color: #c0392b;">管理者画面</button>`;
        }
        
        container.innerHTML = `
            <h1>ログイン成功</h1>
            <p>どの画面に移動しますか？</p>
            <div class="role-selection">
                ${buttonsHtml}
            </div>
        `;
    }
});