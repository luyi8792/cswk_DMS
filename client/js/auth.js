// 登录状态管理
let userRole = null;
let token = localStorage.getItem('token');

// 检查登录状态
function checkAuth() {
    if (!token) {
        showPage('login');
        return false;
    }
    return true;
}

// 检查是否为管理员
function isAdmin() {
    try {
        const user = JSON.parse(atob(token.split('.')[1]));
        return user.role === 'admin';
    } catch (error) {
        return false;
    }
}

// 登录表单处理
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    
    // 移除之前的错误状态
    usernameInput.classList.remove('error');
    passwordInput.classList.remove('error');

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            userRole = data.role;
            localStorage.setItem('token', token);
            localStorage.setItem('username', usernameInput.value);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('loginTime', new Date().toISOString());
            updateUI();
            showPage('home');
        } else {
            usernameInput.classList.add('error');
            passwordInput.classList.add('error');
            throw new Error(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录失败:', error);
        alert('登录失败：' + error.message);
    }
});

// 退出登录
function logout() {
    token = null;
    userRole = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    showPage('login');
}

// 检查登录状态并显示页面
function checkAuthAndShowPage(pageId) {
    if (!token) {
        showPage('login');
        return;
    }
    showPage(pageId);
}
