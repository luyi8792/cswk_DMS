// 页面切换功能
function showPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    // 显示指定页面
    const page = document.getElementById(pageId + 'Page');
    if (page) {
        page.style.display = 'block';
        
        // 如果是首页，加载统计信息
        if (pageId === 'home') {
            loadHomeStats();
        }
        // 如果是档案列表页面，加载档案列表
        else if (pageId === 'list') {
            loadArchives(1);
        }
        // 如果是搜索页面，清空搜索结果
        else if (pageId === 'search') {
            document.getElementById('searchKeyword').value = '';
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('searchPagination').innerHTML = '';
        }
    }
}

// 加载首页统计信息
async function loadHomeStats() {
    try {
        const response = await fetchWithAuth('/archives/stats');
        if (!response.ok) {
            throw new Error('获取统计信息失败');
        }

        const stats = await response.json();
        
        // 更新总档案数
        document.getElementById('totalArchives').textContent = stats.totalCount || '0';
        
        // 更新最新录入时间
        if (stats.latestArchiveTime) {
            document.getElementById('latestArchive').textContent = 
                new Date(stats.latestArchiveTime).toLocaleString();
        } else {
            document.getElementById('latestArchive').textContent = '暂无记录';
        }
    } catch (error) {
        console.error('加载统计信息失败:', error);
        document.getElementById('totalArchives').textContent = '-';
        document.getElementById('latestArchive').textContent = '-';
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

// 创建档案元素
function createArchiveElement(archive, number) {
    const archiveItem = document.createElement('div');
    archiveItem.className = 'archive-item';

    // 创建档案内容
    const content = document.createElement('div');
    content.className = 'archive-content';

    // 编号
    const numberElement = document.createElement('div');
    numberElement.className = 'archive-number';
    numberElement.textContent = String(number).padStart(2, '0');

    // 基础信息
    content.innerHTML = `
        <p><strong>来源：</strong>${archive.source}</p>
        <p><strong>要素：</strong>${archive.element}</p>
        <div class="creation-info">
            <p><strong>录入时间：</strong>${new Date(archive.createdAt).toLocaleString()}</p>
            <p><strong>录入账号：</strong>${archive.createdBy}</p>
            <p><strong>录入IP：</strong>${archive.clientIP}</p>
        </div>
    `;

    // 自定义数据
    if (archive.customData && Object.keys(archive.customData).length > 0) {
        const customDataHtml = Object.entries(archive.customData)
            .map(([key, value]) => `<p><strong>${key}：</strong>${value}</p>`)
            .join('');
        content.innerHTML += `<div class="custom-data">${customDataHtml}</div>`;
    }

    // 操作按钮
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';

    // 编辑按钮
    const editButton = document.createElement('button');
    editButton.className = 'edit-btn';
    editButton.innerHTML = '<i class="fas fa-edit"></i> 修改';
    editButton.onclick = () => showEditDialog(archive);

    // 删除按钮（仅管理员可见）
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> 删除';
    deleteButton.onclick = () => deleteArchive(archive._id);

    actionButtons.appendChild(editButton);
    // 只有管理员才能看到删除按钮
    if (isAdmin()) {
        actionButtons.appendChild(deleteButton);
    }

    archiveItem.appendChild(numberElement);
    archiveItem.appendChild(content);
    archiveItem.appendChild(actionButtons);
    return archiveItem;
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

// 加载档案列表
async function loadArchives(page = 1) {
    try {
        const response = await fetchWithAuth(`/archives?page=${page}`);
        if (!response.ok) {
            throw new Error('加载档案失败');
        }

        const data = await response.json();
        const archivesList = document.getElementById('archivesList');
        const pagination = document.getElementById('listPagination');

        // 清空现有内容
        archivesList.innerHTML = '';

        // 显示档案列表
        if (data.archives && data.archives.length > 0) {
            // 计算起始编号（总数 - 当前页起始位置）
            const startIndex = data.total - ((page - 1) * 10);
            
            data.archives.forEach((archive, index) => {
                const archiveElement = createArchiveElement(archive, startIndex - index);
                archivesList.appendChild(archiveElement);
            });
        } else {
            archivesList.innerHTML = '<p class="no-data">暂无档案</p>';
        }

        // 更新分页
        updatePagination(pagination, {
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            onPageChange: loadArchives
        });
    } catch (error) {
        console.error('加载档案失败:', error);
        alert('加载档案失败，请重试');
    }
}

// 更新分页控件
function updatePagination(paginationElement, { currentPage, totalPages, onPageChange }) {
    paginationElement.innerHTML = '';

    // 如果总页数小于等于1，不显示分页
    if (totalPages <= 1) return;

    // 创建分页按钮
    const createPageButton = (page, text, isActive = false) => {
        const button = document.createElement('button');
        button.textContent = text || page;
        if (isActive) button.classList.add('active');
        button.onclick = () => onPageChange(page);
        return button;
    };

    // 添加上一页按钮
    if (currentPage > 1) {
        paginationElement.appendChild(createPageButton(currentPage - 1, '上一页'));
    }

    // 添加页码按钮
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || // 第一页
            i === totalPages || // 最后一页
            (i >= currentPage - 2 && i <= currentPage + 2) // 当前页附近的页码
        ) {
            paginationElement.appendChild(createPageButton(i, i, i === currentPage));
        } else if (
            i === currentPage - 3 || // 当前页前的省略号
            i === currentPage + 3 // 当前页后的省略号
        ) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationElement.appendChild(ellipsis);
        }
    }

    // 添加下一页按钮
    if (currentPage < totalPages) {
        paginationElement.appendChild(createPageButton(currentPage + 1, '下一页'));
    }
}

// 搜索档案
async function searchArchives(page = 1) {
    const keyword = document.getElementById('searchKeyword').value.trim();
    if (!keyword) {
        alert('请输入搜索关键词');
        return;
    }

    try {
        const response = await fetchWithAuth(`/archives/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
        if (!response.ok) {
            throw new Error('搜索失败');
        }

        const data = await response.json();
        const searchResults = document.getElementById('searchResults');
        const pagination = document.getElementById('searchPagination');

        // 清空现有内容
        searchResults.innerHTML = '';

        // 显示搜索结果
        if (data.archives && data.archives.length > 0) {
            data.archives.forEach((archive, index) => {
                const archiveElement = createArchiveElement(archive, (page - 1) * 10 + index + 1);
                searchResults.appendChild(archiveElement);
            });
        } else {
            searchResults.innerHTML = '<p class="no-data">未找到匹配的档案</p>';
        }

        // 更新分页
        updatePagination(pagination, {
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            onPageChange: (newPage) => searchArchives(newPage)
        });
    } catch (error) {
        console.error('搜索失败:', error);
        alert('搜索失败，请重试');
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

    // 计算起始序号
    const startNumber = (pagination.current - 1) * 10 + 1;

    archives.forEach((archive, index) => {
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

        // 根据用户权限和档案创建者显示操作按钮
        const isAdmin = userRole === 'admin';
        const isCreator = archive.createdBy === localStorage.getItem('username');
        const canEdit = isAdmin || isCreator;
        const canDelete = isAdmin;

        // 添加操作按钮
        const actionButtons = `
            <div class="action-buttons">
                ${canEdit ? `<button onclick="editArchive('${archive._id}')" class="edit-btn">修改</button>` : ''}
                ${canDelete ? `<button onclick="deleteArchive('${archive._id}')" class="delete-btn">删除</button>` : ''}
            </div>
        `;

        // 构建录入信息 HTML
        const creationInfo = `
            <div class="creation-info">
                <p><strong>录入账号：</strong>${archive.createdBy || ''}</p>
                <p><strong>录入时间：</strong>${archive.createdAt ? new Date(archive.createdAt).toLocaleString() : ''}</p>
                <p><strong>客户端IP：</strong>${archive.clientIP || ''}</p>
            </div>
        `;

        // 使用新的布局结构
        archiveElement.innerHTML = `
            <div class="archive-number">${startNumber + index}</div>
            <div class="archive-content">
                ${baseHtml}
                ${customDataHtml}
                ${creationInfo}
            </div>
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
    console.log('页面加载，检查录状态...');
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

// 添加修改档案的函数
async function editArchive(id) {
    try {
        // 移除已存在的编辑对话框
        const existingDialog = document.querySelector('.edit-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const response = await fetchWithAuth(`/archives/${id}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        const archive = await response.json();
        
        // 创建新的编辑对话框
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
                    <button onclick="saveEdit('${id}')" class="btn">保存</button>
                    <button onclick="closeEditDialog()" class="btn">取消</button>
                </div>
            </div>
        `;
        
        // 添加点击背景关闭对话框的功能
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeEditDialog();
            }
        });
        
        document.body.appendChild(dialog);

        // 防止页面滚动
        document.body.style.overflow = 'hidden';
    } catch (error) {
        if (error.message.includes('权限不足')) {
            alert('权限不足：只能修改自己创建的档案');
        } else {
            alert('加载档案失败：' + error.message);
        }
    }
}

// 保存修改
async function saveEdit(id) {
    try {
        const rawCustomData = document.getElementById('editCustomData').value;
        
        const response = await fetchWithAuth(`/archives/${id}`, {
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
        if (error.message === '未登录' || error.message === '登录已过期，请重新登录') {
            showPage('login');
        }
        alert('保存失败：' + error.message);
    }
}

// 关闭修改对话框
function closeEditDialog() {
    const dialog = document.querySelector('.edit-dialog');
    if (dialog) {
        dialog.remove();
        // 恢复页面滚动
        document.body.style.overflow = '';
    }
}

// 删除档案
async function deleteArchive(id) {
    if (!confirm('确定要删除这条档案吗？')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/archives/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        alert('删除成功');
        // 刷新档案列表
        if (document.getElementById('listPage').style.display !== 'none') {
            loadArchivesList(1);
        } else {
            searchArchives(1);
        }
    } catch (error) {
        if (error.message.includes('权限不足')) {
            alert('权限不足：只有管理员可以删除档案');
        } else {
            alert('删除失败：' + error.message);
        }
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
    
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    
    // 移除之前的错状态
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
            // 登录成功处理...
            token = data.token;
            userRole = data.role;
            localStorage.setItem('token', token);
            localStorage.setItem('username', usernameInput.value);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('loginTime', new Date().toISOString());
            updateUI();
            showPage('home');
        } else {
            // 登录失败，添加错误效果
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
        showPage('login');
        return;
    }
    showPage(pageId);
}

// 显示档案列表
function showArchiveList() {
    checkAuthAndShowPage('list');
}

// 显示最新录入的档案详情
async function showLatestArchive() {
    try {
        const response = await fetchWithAuth('/archives/latest');
        if (!response.ok) {
            throw new Error('获取最新档案失败');
        }

        const archive = await response.json();
        if (archive) {
            // 创建弹出层
            const popup = document.createElement('div');
            popup.className = 'latest-archive-popup';
            
            // 创建卡片内容
            popup.innerHTML = `
                <div class="latest-archive-card">
                    <div class="latest-archive-header">
                        <h3>最新录入档案</h3>
                        <button class="latest-archive-close" onclick="closeLatestArchive()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="latest-archive-content">
                        <div class="latest-archive-item">
                            <div class="latest-archive-label">来源</div>
                            <div class="latest-archive-value">${archive.source}</div>
                        </div>
                        <div class="latest-archive-item">
                            <div class="latest-archive-label">要素</div>
                            <div class="latest-archive-value">${archive.element}</div>
                        </div>
                        <div class="latest-archive-item">
                            <div class="latest-archive-label">录入时间</div>
                            <div class="latest-archive-value">${new Date(archive.createdAt).toLocaleString()}</div>
                        </div>
                        <div class="latest-archive-item">
                            <div class="latest-archive-label">录入账号</div>
                            <div class="latest-archive-value">${archive.createdBy}</div>
                        </div>
                        <div class="latest-archive-item">
                            <div class="latest-archive-label">录入IP</div>
                            <div class="latest-archive-value">${archive.clientIP}</div>
                        </div>
                        ${archive.customData && Object.keys(archive.customData).length > 0 ? `
                            <div class="latest-archive-item">
                                <div class="latest-archive-label">自定义数据</div>
                                ${Object.entries(archive.customData).map(([key, value]) => `
                                    <div class="latest-archive-value">${key}: ${value}</div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // 添加到页面
            document.body.appendChild(popup);
            
            // 添加点击外部关闭功能
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    closeLatestArchive();
                }
            });

            // 显示弹出层
            requestAnimationFrame(() => {
                popup.classList.add('active');
            });
        }
    } catch (error) {
        console.error('获取最新���案失败:', error);
        alert('获取最新档案失败，请重试');
    }
}

// 关闭最新档案弹出层
function closeLatestArchive() {
    const popup = document.querySelector('.latest-archive-popup');
    if (popup) {
        popup.classList.remove('active');
        setTimeout(() => {
            popup.remove();
        }, 300); // 等待动画完成
    }
}

// 显示编辑对话框
function showEditDialog(archive) {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    dialog.innerHTML = `
        <div class="edit-content">
            <h3>修改档案</h3>
            <div class="form-group">
                <label>自定义数据：</label>
                <textarea id="editCustomData" rows="10" placeholder="请输入键值对格式的数据，每行一个，使用冒号分隔">${archive.rawCustomData || ''}</textarea>
            </div>
            <div class="button-group">
                <button onclick="updateArchive('${archive._id}')">保存</button>
                <button onclick="closeEditDialog()">取消</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
}

// 关闭编辑对话框
function closeEditDialog() {
    const dialog = document.querySelector('.edit-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// 更新档案
async function updateArchive(id) {
    try {
        const rawCustomData = document.getElementById('editCustomData').value;
        
        const response = await fetchWithAuth(`/archives/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rawCustomData })
        });

        if (!response.ok) {
            throw new Error('更新档案失败');
        }

        closeEditDialog();
        loadArchives(); // 重新加载列表
        alert('更新成功');
    } catch (error) {
        console.error('更新档案失败:', error);
        alert('更新档案失败，请重试');
    }
}

// 删除档案
async function deleteArchive(id) {
    if (!confirm('确定要删除这条档案吗？此操作不可恢复。')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/archives/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除档案失败');
        }

        loadArchives(); // 重新加载列表
        alert('删除成功');
    } catch (error) {
        console.error('删除档案失败:', error);
        alert('删除档案失败��请重试');
    }
}