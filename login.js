// ★★★ ここを追記 ★★★
// ファイルの最初に、APIのベースURLを定義します。
// これにより、以降のどのコードからもこの定数を正しく参照できます。
const API_BASE_URL = window.location.origin;

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
            // これで `API_BASE_URL` が正しく認識されます
            const response = await fetch(`${API_BASE_URL}/api/login`, {
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