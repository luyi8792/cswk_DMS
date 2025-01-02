// 显示页面
function showPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    // 显示指定页面
    const page = document.getElementById(pageId + 'Page');
    if (page) {
        page.style.display = 'block';
    }

    // 根据页面类型执行相应的加载操作
    switch (pageId) {
        case 'home':
            loadHomeStats();
            break;
        case 'list':
            loadArchivesList(1);
            break;
        case 'search':
            // 清空搜索结果和加载标签池
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('searchPagination').innerHTML = '';
            loadTags('search');
            break;
        case 'settings':
            // 加载标签列表和标签池
            loadTagsList();
            break;
        case 'input':
            // 加载标签池
            loadTags('input');
            break;
    }
}

// 更新UI显示
function updateUI() {
    console.log('更新UI，角色:', userRole);
    const isAdmin = userRole === 'admin';
    
    // 显示/隐藏管理功能
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
    });
    
    // 更新用户信息显示
    const username = localStorage.getItem('username');
    const userInfo = document.getElementById('username');
    if (username && userInfo) {
        userInfo.textContent = `${username} (${isAdmin ? '管理员' : '普通用户'})`;
    }
}

// 添加汉堡菜单控制函数
function toggleMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    menuToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
}

// 点击导航链接时关闭菜单
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// 点击页面其他地方关闭菜单
document.addEventListener('click', (e) => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
    }
});
