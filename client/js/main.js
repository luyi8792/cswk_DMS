// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 初始化用户状态
        if (initializeUserState()) {
            // 验证token是否有效
            const response = await fetchWithAuth('/auth/verify');
            if (!response.ok) {
                throw new Error('Token验证失败');
            }

            // 初始化页面
            showPage('list');
            
            // 等待标签加载完成
            try {
                await Promise.all([
                    loadTags('input'),
                    loadTags('search')
                ]);
                
                // 如果是管理员，加载标签列表
                if (userRole === 'admin') {
                    await loadTagsList();
                }
            } catch (error) {
                console.error('加载标签失败:', error);
                alert('加载标签失败，请刷新页面重试');
            }
        } else {
            showPage('login');
        }
    } catch (error) {
        console.error('初始化失败:', error);
        logout(); // 如果验证失败，执行登出操作
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
