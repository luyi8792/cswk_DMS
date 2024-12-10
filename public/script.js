// 页面切换功能
function showPage(pageId, clickEvent = null) {
    console.log('Showing page:', pageId);
    const pages = ['home', 'input', 'list', 'search', 'login'];
    pages.forEach(page => {
        const element = document.getElementById(page + 'Page');
        if (element) {
            element.style.display = page === pageId ? 'block' : 'none';
        }
    });
    
    // 更新导航栏激活状态
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' && link.getAttribute('onclick').includes(pageId)) {
            link.classList.add('active');
        }
    });

    // 加载页面数据
    if (pageId === 'home') loadHomeStats();
    if (pageId === 'list') loadArchivesList(1);

    // 关闭移动端菜单
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.remove('active');
}

// 加载首页统计数据
async function loadHomeStats() {
    try {
        const response = await fetchWithAuth('/archives/stats');
        const stats = await response.json();
        document.getElementById('statsContent').innerHTML = `
            <p>总档案数：${stats.totalCount}</p>
            <p>最新录入时间：${stats.latestArchiveTime ? new Date(stats.latestArchiveTime).toLocaleString() : '暂无记录'}</p>
        `;
    } catch (error) {
        console.error('加载统计数据失败：', error);
        if (error.message === '未登录' || error.message === '登录已过期，请重新登录') {
            showPage('login');
        }
        document.getElementById('statsContent').innerHTML = `
            <p>加载统计数据失败</p>
            <p>错误信息：${error.message}</p>
        `;
    }
}

// 提交档案表单
document.getElementById('archiveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        source: document.getElementById('source').value,
        element: document.getElementById('element').value,
        rawCustomData: document.getElementById('customDataText').value
    };

    try {
        const response = await fetchWithAuth('/archives', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('档案添加成功！');
            document.getElementById('archiveForm').reset();
        } else {
            const error = await response.json();
            alert('错误：' + error.message);
        }
    } catch (error) {
        if (error.message === '未登录' || error.message === '登录已过期，请重新登录') {
            showPage('login');
        }
        alert('提交失败：' + error.message);
    }
});

// 加载档案列表
async function loadArchivesList(page) {
    try {
        const response = await fetchWithAuth(`/archives?page=${page}`);
        const data = await response.json();
        displayArchives(data.archives, data.pagination, 'archivesList', 'listPagination');
    } catch (error) {
        if (error.message === '未登录' || error.message === '登录已过期，请重新登录') {
            showPage('login');
        }
        alert('加载档案失败：' + error.message);
    }
}

// 搜索档案
async function searchArchives(page = 1) {
    try {
        const keyword = document.getElementById('searchKeyword').value;
        console.log('搜索关键词:', keyword);

        const response = await fetchWithAuth(`/archives/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('搜索结果:', data);

        if (!data) {
            throw new Error('没有收到搜索结果数据');
        }

        if (!Array.isArray(data.archives)) {
            console.error('数据格式错误:', data);
            throw new Error('搜索结果格式不正确');
        }

        displayArchives(data.archives, data.pagination, 'searchResults', 'searchPagination');
    } catch (error) {
        console.error('搜索错误:', error);
        if (error.message === '未登录' || error.message === '登录已过期，请重新登录') {
            showPage('login');
        } else {
            document.getElementById('searchResults').innerHTML = `
                <div class="error-message">
                    <p>搜索失败：${error.message}</p>
                </div>
            `;
            document.getElementById('searchPagination').innerHTML = '';
        }
    }
}

// 显示档案列表
function displayArchives(archives, pagination, containerId, paginationId) {
    console.log('Displaying archives:', { archives, pagination, containerId, paginationId });

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container not found: ${containerId}`);
        return;
    }
    container.innerHTML = '';

    if (!Array.isArray(archives) || archives.length === 0) {
        container.innerHTML = '<div class="no-data">没有找到相关档案</div>';
        document.getElementById(paginationId).innerHTML = '';
        return;
    }

    archives.forEach(archive => {
        const archiveElement = document.createElement('div');
        archiveElement.className = 'archive-item';
        
        // 构建基础数据 HTML
        let baseHtml = `
            <p><strong>来源：</strong>${archive.source || ''}</p>
            <p><strong>要素：</strong>${archive.element || ''}</p>
        `;

        // 构建自定义数据 HTML
        let customDataHtml = '';
        if (archive.customData) {
            for (const [dataType, value] of Object.entries(archive.customData)) {
                customDataHtml += `<p><strong>${dataType}：</strong>${value || ''}</p>`;
            }
        }

        // 添加操作按钮
        const actionButtons = `
            <div class="action-buttons">
                <button onclick="editArchive('${archive._id}')" class="edit-btn">修改</button>
                <button onclick="deleteArchive('${archive._id}')" class="delete-btn">删除</button>
            </div>
        `;

        archiveElement.innerHTML = `
            ${baseHtml}
            ${customDataHtml}
            <p><strong>录入时间：</strong>${archive.createdAt ? new Date(archive.createdAt).toLocaleString() : ''}</p>
            ${actionButtons}
        `;
        container.appendChild(archiveElement);
    });

    // 显示分页
    const paginationContainer = document.getElementById(paginationId);
    paginationContainer.innerHTML = '';
    
    if (pagination && pagination.total > 1) {
        for (let i = 1; i <= pagination.total; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.onclick = () => containerId === 'archivesList' ? 
                loadArchivesList(i) : searchArchives(i);
            if (i === pagination.current) button.classList.add('active');
            paginationContainer.appendChild(button);
        }
    }
}

// 页面加载时显示首页
window.onload = () => {
    console.log('���面加载，检查登录状态...');
    token = localStorage.getItem('token');
    userRole = localStorage.getItem('userRole');
    
    if (token) {
        // 检查登录时间
        const loginTime = new Date(localStorage.getItem('loginTime'));
        const now = new Date();
        const daysPassed = (now - loginTime) / (1000 * 60 * 60 * 24);
        
        if (daysPassed > 7) {
            console.log('登录已过期');
            logout();
            return;
        }
        
        console.log('登录状态有效');
        updateUI();
        showPage('home');
    } else {
        console.log('未登录');
        showPage('login');
    }
};

// 添加汉堡菜单控制函数
function toggleMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// 点击页面其他地方关闭菜单
document.addEventListener('click', (e) => {
    const navMenu = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');
    
    if (navMenu.classList.contains('active') && 
        !e.target.closest('.nav-menu') && 
        !e.target.closest('.hamburger')) {
        navMenu.classList.remove('active');
    }
});

// 添加修改档案的函数
async function editArchive(id) {
    try {
        const response = await fetch(`/archives/${id}`);
        const archive = await response.json();
        
        // 显示修改对话框
        const dialog = document.createElement('div');
        dialog.className = 'edit-dialog';
        dialog.innerHTML = `
            <div class="edit-content">
                <h3>修改档案</h3>
                <div class="form-group">
                    <label>来源：${archive.source}</label>
                </div>
                <div class="form-group">
                    <label>要素：${archive.element}</label>
                </div>
                <div class="form-group">
                    <label for="editCustomData">自定义数据：</label>
                    <textarea id="editCustomData" rows="10">${archive.rawCustomData || ''}</textarea>
                </div>
                <div class="button-group">
                    <button onclick="saveEdit('${id}')">保存</button>
                    <button onclick="closeEditDialog()">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    } catch (error) {
        alert('加载档案失败：' + error.message);
    }
}

// 保存修改
async function saveEdit(id) {
    try {
        const rawCustomData = document.getElementById('editCustomData').value;
        
        const response = await fetch(`/archives/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rawCustomData })
        });

        if (response.ok) {
            alert('修改成功');
            closeEditDialog();
            // 刷新档案列表
            if (document.getElementById('listPage').style.display !== 'none') {
                loadArchivesList(1);
            } else {
                searchArchives(1);
            }
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        alert('保存失败：' + error.message);
    }
}

// 关闭修改对话框
function closeEditDialog() {
    const dialog = document.querySelector('.edit-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// 删除档案
async function deleteArchive(id) {
    if (!confirm('确定要删除这条档案吗？')) {
        return;
    }

    try {
        const response = await fetch(`/archives/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('删除成功');
            // 刷新档案列表
            if (document.getElementById('listPage').style.display !== 'none') {
                loadArchivesList(1);
            } else {
                searchArchives(1);
            }
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        alert('删除失败：' + error.message);
    }
}

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

// 登录表单处理
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        console.log('发送登录请求...');
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('登录成功，保存用户信息...');
            token = data.token;
            userRole = data.role;
            
            // 保存登录状态
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('loginTime', new Date().toISOString());
            
            updateUI();
            showPage('home');
        } else {
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

// 更新UI显示
function updateUI() {
    console.log('更新UI，角色:', userRole);
    const isAdmin = userRole === 'admin';
    
    // 显示/隐藏管理员功能
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

// 修改现有的 fetch 请求，添加 token
async function fetchWithAuth(url, options = {}) {
    if (!token) {
        throw new Error('未登录');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
        logout();
        throw new Error('登录已过期，请重新登录');
    }
    
    return response;
}

// 添加检查登录状态并显示页面的函数
function checkAuthAndShowPage(pageId) {
    if (!token) {
        console.log('未登录，显示登录页面');
        showPage('login');
        return;
    }
    showPage(pageId);
}