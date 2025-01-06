// 登录状态管理
let userRole = null;
let token = localStorage.getItem('token');

// 初始化用户状态
function initializeUserState() {
    token = localStorage.getItem('token');
    if (token) {
        userRole = localStorage.getItem('userRole');
        updateUIBasedOnRole();
        return true;
    }
    return false;
}

// 更新基于角色的UI元素
function updateUIBasedOnRole() {
    // 只处理当前显示页面中的元素
    const currentPage = document.querySelector('.page:not([style*="display: none"])');
    if (!currentPage) return;

    // 处理删除按钮
    const deleteButtons = currentPage.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => {
        button.style.display = userRole === 'admin' ? 'block' : 'none';
    });

    // 处理管理员专属元素
    const adminOnlyElements = currentPage.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(element => {
        element.style.display = userRole === 'admin' ? 'block' : 'none';
    });

    // 处理导航栏中的管理员专属元素
    const navAdminElements = document.querySelectorAll('.nav-menu .admin-only');
    navAdminElements.forEach(element => {
        element.style.display = userRole === 'admin' ? 'block' : 'none';
    });
}

// 检查登录状态
function checkAuth() {
    if (!token) {
        showPage('login');
        return false;
    }
    // 验证token中的用户角色
    try {
        const user = JSON.parse(atob(token.split('.')[1]));
        userRole = user.role;
        return true;
    } catch (error) {
        console.error('Token验证失败:', error);
        logout();
        return false;
    }
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
            updateUIBasedOnRole();
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
    localStorage.removeItem('loginTime');
    showPage('login');
}

// 检查登录状态并显示页面
function checkAuthAndShowPage(pageId) {
    if (!initializeUserState()) {
        showPage('login');
        return;
    }
    
    if (pageId === 'settings' && userRole !== 'admin') {
        showPage('home');
        return;
    }
    
    showPage(pageId);
    updateUIBasedOnRole();
}
