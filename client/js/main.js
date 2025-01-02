// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    const token = localStorage.getItem('token');
    if (token) {
        userRole = localStorage.getItem('role');
        // 初始化页面
        showPage('list');
        // 加载标签池
        loadTags('input');
        loadTags('search');
        // 如果是管理员，加载标签列表
        if (userRole === 'admin') {
            loadTagsList();
        }
    } else {
        showPage('login');
    }

    // 绑定表单提交事件
    document.getElementById('archiveForm').addEventListener('submit', submitArchive);
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        searchArchives(1);
    });

    // 绑定导航菜单事件
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            const menuToggle = document.querySelector('.menu-toggle');
            const navMenu = document.querySelector('.nav-menu');
            menuToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // 绑定点击页面其他地方关闭菜单事件
    document.addEventListener('click', (e) => {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav-menu');
        if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
            menuToggle.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
});
