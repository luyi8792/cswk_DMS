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
        <p>
            <strong>来源：</strong>
            <span title="${archive.source}">${truncateText(archive.source, 64)}</span>
        </p>
        <p>
            <strong>要素：</strong>
            <span title="${archive.element}">${truncateText(archive.element, 64)}</span>
        </p>
    `;

    // 标签
    if (archive.tags && archive.tags.length > 0) {
        const tagsHtml = `
            <div class="archive-tags-section">
                <p class="tags-label"><strong>标签：</strong></p>
                <div class="archive-tags">
                    ${archive.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
        content.innerHTML += tagsHtml;
    }

    // 自定义数据
    if (archive.rawCustomData) {
        const lines = archive.rawCustomData.split('\n');
        const displayLines = lines.slice(0, 3);
        const remainingCount = lines.length - 3;

        const customDataHtml = `
            <div class="custom-data">
                <pre>${displayLines.join('\n')}</pre>
                ${remainingCount > 0 ? `<p class="more-data">还有 ${remainingCount} 行...</p>` : ''}
            </div>`;
        content.innerHTML += customDataHtml;
    }

    // 创建信息
    content.innerHTML += `
        <div class="creation-info">
            <p><strong>录入账号：</strong>${archive.createdBy || ''}</p>
            <p><strong>录入时间：</strong>${archive.createdAt ? new Date(archive.createdAt).toLocaleString() : ''}</p>
        </div>
    `;

    // 操作按钮
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';

    // 详情按钮
    const detailButton = document.createElement('button');
    detailButton.className = 'detail-btn';
    detailButton.innerHTML = '<i class="fas fa-info-circle"></i> 详情';
    detailButton.onclick = () => showArchiveDetail(archive._id);

    // 编辑按钮
    const editButton = document.createElement('button');
    editButton.className = 'edit-btn';
    editButton.innerHTML = '<i class="fas fa-edit"></i> 修改';
    editButton.onclick = () => showEditDialog(archive._id);

    // 删除按钮（仅管理员可见）
    if (userRole === 'admin') {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> 删除';
        deleteButton.onclick = () => deleteArchive(archive._id);
        actionButtons.appendChild(deleteButton);
    }

    actionButtons.appendChild(detailButton);
    actionButtons.appendChild(editButton);

    archiveItem.appendChild(numberElement);
    archiveItem.appendChild(content);
    archiveItem.appendChild(actionButtons);

    return archiveItem;
}

// 文本截断函数
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

    // 添加一页按钮
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
    try {
        const keyword = document.getElementById('searchInput').value.trim();
        const selectedTagsContainer = document.getElementById('searchSelectedTags');
        const selectedTags = Array.from(selectedTagsContainer.children)
            .map(tag => tag.textContent.trim())
            .filter(tag => tag); // 过滤掉空标签
        
        const queryParams = new URLSearchParams({
            page: page,
            limit: 10
        });

        if (keyword) {
            queryParams.append('keyword', keyword);
        }

        if (selectedTags.length > 0) {
            queryParams.append('tags', selectedTags.join(','));
        }

        const response = await fetchWithAuth(`/archives/search?${queryParams}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '搜索失败');
        }

        const data = await response.json();
        
        // 检查返回的数据结构
        if (!data || !Array.isArray(data.archives)) {
            throw new Error('返回的数据格式不正确');
        }
        
        const pagination = {
            current: parseInt(page),
            pageSize: 10,
            total: Math.ceil((data.total || 0) / 10)
        };

        // 显示搜索结果
        const searchResults = document.getElementById('searchResults');
        if (data.archives.length === 0) {
            searchResults.innerHTML = '<div class="no-data">未找到匹配的档案</div>';
        } else {
            displayArchives(data.archives, pagination, 'searchResults', 'searchPagination');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        alert('搜索失败：' + error.message);
    }
}

// 显示档案列表
function displayArchives(archives, pagination, containerId, paginationId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!archives || archives.length === 0) {
        container.innerHTML = '<div class="no-data">无数据</div>';
        return;
    }
    
    console.log('正在显示档案列表，数据:', {
        archivesCount: archives.length,
        sampleArchive: archives[0] ? {
            id: archives[0]._id,
            source: archives[0].source,
            tags: archives[0].tags,
            rawCustomData: archives[0].rawCustomData
        } : null
    });
    
    archives.forEach((archive, index) => {
        const number = pagination ? (pagination.current - 1) * pagination.pageSize + index + 1 : index + 1;
        
        // 创建档案元素
        const archiveElement = document.createElement('div');
        archiveElement.className = 'archive-item';
        
        // 构建标签HTML
        const tagsHtml = archive.tags && archive.tags.length > 0 
            ? `<div class="archive-tags-section">
                <p class="tags-label"><strong>标签：</strong></p>
                <div class="archive-tags">
                    ${archive.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
               </div>` 
            : '';
            
        // 构建自定义数据HTML
        const customDataHtml = archive.rawCustomData 
            ? `<div class="custom-data">
                <h4>自定义数据：</h4>
                <pre>${archive.rawCustomData}</pre>
               </div>`
            : '';
        
        archiveElement.innerHTML = `
            <div class="archive-number">${String(number).padStart(2, '0')}</div>
            <div class="archive-content">
                <div class="basic-info">
                    <p><strong>来源：</strong><span>${archive.source || ''}</span></p>
                    <p><strong>要素：</strong><span>${archive.element || ''}</span></p>
                </div>
                ${tagsHtml}
                ${customDataHtml}
                <div class="creation-info">
                    <p><strong>录入账号：</strong>${archive.createdBy || ''}</p>
                    <p><strong>录入时间：</strong>${archive.createdAt ? new Date(archive.createdAt).toLocaleString() : ''}</p>
                </div>
            </div>
            <div class="action-buttons">
                <button onclick="showArchiveDetail('${archive._id}')" class="detail-btn">
                    <i class="fas fa-info-circle"></i> 详情
                </button>
                <button onclick="showEditDialog('${archive._id}')" class="edit-btn">
                    <i class="fas fa-edit"></i> 修改
                </button>
                ${userRole === 'admin' ? `
                    <button onclick="deleteArchive('${archive._id}')" class="delete-btn">
                        <i class="fas fa-trash-alt"></i> 删除
                    </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(archiveElement);
    });

    // 更新分页
    const paginationContainer = document.getElementById(paginationId);
    if (paginationContainer && pagination) {
        updatePagination(paginationContainer, {
            currentPage: pagination.current,
            totalPages: pagination.total,
            onPageChange: (page) => {
                if (containerId === 'archivesList') {
                    loadArchivesList(page);
                } else {
                    searchArchives(page);
                }
            }
        });
    }
}

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
});

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

// 搜索档案
async function searchArchives(page = 1) {
    try {
        const keyword = document.getElementById('searchInput').value.trim();
        const selectedTagsContainer = document.getElementById('searchSelectedTags');
        const selectedTags = Array.from(selectedTagsContainer.children)
            .map(tag => tag.textContent.trim())
            .filter(tag => tag); // 过滤掉空标签
        
        const queryParams = new URLSearchParams({
            page: page,
            limit: 10
        });

        if (keyword) {
            queryParams.append('keyword', keyword);
        }

        if (selectedTags.length > 0) {
            queryParams.append('tags', selectedTags.join(','));
        }

        const response = await fetchWithAuth(`/archives/search?${queryParams}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '搜索失败');
        }

        const data = await response.json();
        
        // 检查返回的数据结构
        if (!data || !Array.isArray(data.archives)) {
            throw new Error('返回的数据格式不正确');
        }
        
        const pagination = {
            current: parseInt(page),
            pageSize: 10,
            total: Math.ceil((data.total || 0) / 10)
        };

        // 显示搜索结果
        const searchResults = document.getElementById('searchResults');
        if (data.archives.length === 0) {
            searchResults.innerHTML = '<div class="no-data">未找到匹配的档案</div>';
        } else {
            displayArchives(data.archives, pagination, 'searchResults', 'searchPagination');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        alert('搜索失败：' + error.message);
    }
}

// 加载标签池
async function loadTags(context = 'input') {
    try {
        const response = await fetchWithAuth('/tags');
        if (!response.ok) {
            throw new Error('加载标签失败');
        }
        const tags = await response.json();
        
        let tagPoolId;
        if (context === 'input') {
            tagPoolId = 'tagPool';
        } else if (context === 'search') {
            tagPoolId = 'searchTagPool';
        } else if (context === 'edit') {
            tagPoolId = 'editTagPool';
        }
        
        const tagPool = document.getElementById(tagPoolId);
        if (!tagPool) return;
        
        const tagPoolGrid = tagPool.querySelector('.tag-pool-grid') || tagPool;
        // 默认显示所有标签
        tagPoolGrid.innerHTML = tags.map(tag => `
            <span class="tag" onclick="selectTag('${tag.name}', '${context}')">
                ${tag.name}
            </span>
        `).join('');
        
        // 如果是设置页面，默���展开
        if (context === 'settings') {
            tagPool.classList.add('expanded');
            const toggleButton = tagPool.querySelector('.tag-pool-toggle');
            if (toggleButton) {
                toggleButton.textContent = '收起';
            }
        }
    } catch (error) {
        console.error('加载标签失败:', error);
        alert('加载标签失败：' + error.message);
    }
}

// 选择标签
function selectTag(tagName, context) {
    let selectedTagsContainer;
    let selectedTagsInput;
    
    if (context === 'input') {
        selectedTagsContainer = document.getElementById('selectedTags');
        selectedTagsInput = document.getElementById('selectedTagsInput');
    } else if (context === 'search') {
        selectedTagsContainer = document.getElementById('searchSelectedTags');
        selectedTagsInput = document.getElementById('searchSelectedTagsInput');
    } else if (context === 'edit') {
        selectedTagsContainer = document.getElementById('editSelectedTags');
        selectedTagsInput = document.getElementById('editSelectedTagsInput');
    }
    
    if (!selectedTagsContainer || !selectedTagsInput) return;
    
    // 检查标签是否已存在
    const existingTag = Array.from(selectedTagsContainer.children)
        .find(tag => tag.textContent.trim() === tagName);
    
    if (existingTag) return;
    
    // 创建新标签元素
    const tagElement = document.createElement('span');
    tagElement.className = 'tag selected';
    tagElement.textContent = tagName;
    tagElement.onclick = () => {
        tagElement.remove();
        updateSelectedTags(context);
        if (context === 'search') {
            searchArchives(1);
        }
    };
    
    // 添加标签到容器
    selectedTagsContainer.appendChild(tagElement);
    updateSelectedTags(context);
    
    // 如果是搜索上下文，立即触发搜索
    if (context === 'search') {
        searchArchives(1);
    }
}

// 更新已选标签
function updateSelectedTags(context) {
    let selectedTagsContainer;
    let selectedTagsInput;
    
    if (context === 'input') {
        selectedTagsContainer = document.getElementById('selectedTags');
        selectedTagsInput = document.getElementById('selectedTagsInput');
    } else if (context === 'search') {
        selectedTagsContainer = document.getElementById('searchSelectedTags');
        selectedTagsInput = document.getElementById('searchSelectedTagsInput');
    } else if (context === 'edit') {
        selectedTagsContainer = document.getElementById('editSelectedTags');
        selectedTagsInput = document.getElementById('editSelectedTagsInput');
    }
    
    if (!selectedTagsContainer || !selectedTagsInput) return;
    
    // 获取所有已选标签
    const selectedTags = Array.from(selectedTagsContainer.children)
        .map(tag => tag.textContent.trim());
    
    // 更新隐藏输入字段的值
    selectedTagsInput.value = JSON.stringify(selectedTags);
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
            // 录失败，添加错误效果
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
async function showLatestArchive(archive) {
    try {
        if (!archive) {
            const response = await fetchWithAuth('/archives?page=1&limit=1');
            if (!response.ok) {
                throw new Error('获取最新档案失败');
            }
            const data = await response.json();
            if (!data.archives || data.archives.length === 0) {
                return;
            }
            archive = data.archives[0];
        }

        const popup = document.createElement('div');
        popup.className = 'latest-archive-popup';
        
        const tagsHtml = archive.tags && archive.tags.length > 0 
            ? `<div class="archive-tags">
                ${archive.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
               </div>` 
            : '';
            
        const customDataHtml = archive.rawCustomData 
            ? `<div class="custom-data">
                <h4>自定义数据：</h4>
                <pre>${archive.rawCustomData}</pre>
               </div>`
            : '';

        popup.innerHTML = `
            <div class="latest-archive-card">
                <div class="latest-archive-header">
                    <h3>最新录入档案</h3>
                    <button class="latest-archive-close" onclick="closeLatestArchive()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="latest-archive-content">
                    <p><strong>来源：</strong>${archive.source || ''}</p>
                    <p><strong>要素：</strong>${archive.element || ''}</p>
                    ${tagsHtml}
                    ${customDataHtml}
                    <div class="creation-info">
                        <p><strong>录入账号：</strong>${archive.createdBy || ''}</p>
                        <p><strong>录入时间：</strong>${archive.createdAt ? new Date(archive.createdAt).toLocaleString() : ''}</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        
        requestAnimationFrame(() => {
            popup.classList.add('active');
        });
    } catch (error) {
        console.error('显示最新档案失败:', error);
        alert('显示最新档案失败，请重试');
    }
}

// 关闭最新档案弹出层
function closeLatestArchive() {
    const popup = document.querySelector('.latest-archive-popup');
    if (popup) {
        popup.classList.remove('active');
        setTimeout(() => {
            popup.remove();
        }, 300); // 等待画完成
    }
}

// 显示编辑对话框
async function showEditDialog(archiveId) {
    try {
        const response = await fetchWithAuth(`/archives/${archiveId}`);
        if (!response.ok) {
            throw new Error('获取档案失败');
        }
        const archive = await response.json();
        
        const dialog = document.createElement('div');
        dialog.className = 'edit-dialog';
        
        dialog.innerHTML = `
            <div class="edit-content">
                <h3>修改档案</h3>
                <div class="form-group">
                    <label>来源：</label>
                    <input type="text" value="${archive.source || ''}" readonly>
                </div>
                <div class="form-group">
                    <label>要素：</label>
                    <input type="text" value="${archive.element || ''}" readonly>
                </div>
                <div class="form-group">
                    <label>标签：</label>
                    <div class="selected-tags" id="editSelectedTags">
                        ${archive.tags ? archive.tags.map(tag => 
                            `<span class="tag selected" onclick="this.remove(); updateSelectedTags('edit');">
                                ${tag}
                            </span>`
                        ).join('') : ''}
                    </div>
                    <input type="hidden" id="editSelectedTagsInput" value="${JSON.stringify(archive.tags || [])}">
                </div>
                <div class="form-group">
                    <label>自定义数据：</label>
                    <textarea id="editRawCustomData" rows="10" placeholder="请输入键值对格式的数据，每行一个，使用冒号分隔">${archive.rawCustomData || ''}</textarea>
                </div>
                <div class="button-group">
                    <button onclick="updateArchive('${archive._id}')" class="primary-button">保存</button>
                    <button onclick="closeEditDialog()" class="secondary-button">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeEditDialog();
            }
        });
    } catch (error) {
        console.error('显示编辑对话框失败:', error);
        alert('显示编辑对话框失败：' + error.message);
    }
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
        const rawCustomData = document.getElementById('editRawCustomData').value;
        const selectedTagsInput = document.getElementById('editSelectedTagsInput');
        const tags = JSON.parse(selectedTagsInput.value || '[]');
        
        console.log('准备更新档案:', {
            id,
            rawCustomData,
            tags
        });
        
        const response = await fetchWithAuth(`/archives/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                rawCustomData,
                tags
            })
        });

        if (!response.ok) {
            throw new Error('更新档案失败');
        }

        closeEditDialog();
        loadArchivesList(1); // 重新加载列表
        alert('更新成功');
    } catch (error) {
        console.error('更新档案失败:', error);
        alert('更新档案失败：' + error.message);
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
        alert('删除档案失败，请重试');
    }
}

// 显示档案详情
async function showArchiveDetail(archiveIdOrObject) {
    try {
        let archive;
        
        // 判断传入的是ID还是档案对象
        if (typeof archiveIdOrObject === 'string') {
            // 如果是ID，需要从服务器获取档案数据
            const response = await fetchWithAuth(`/archives/${archiveIdOrObject}`);
            if (!response.ok) {
                throw new Error('获取档案详情失败');
            }
            archive = await response.json();
        } else {
            // 如果是档案对象，直接使用
            archive = archiveIdOrObject;
        }
        
        const popup = document.createElement('div');
        popup.className = 'archive-detail-popup';
        
        // 构建标签HTML
        const tagsHtml = archive.tags && archive.tags.length > 0 
            ? `<div class="detail-section">
                <h4>标签</h4>
                <div class="archive-tags">
                    ${archive.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
               </div>`
            : '';
            
        // 构建自定义数据HTML
        const customDataHtml = archive.rawCustomData 
            ? `<div class="detail-section">
                <h4>自定义数据</h4>
                <pre>${archive.rawCustomData}</pre>
               </div>`
            : '';
        
        popup.innerHTML = `
            <div class="archive-detail-card">
                <div class="archive-detail-header">
                    <h3>档案详情</h3>
                    <button class="archive-detail-close" onclick="closeArchiveDetail()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="archive-detail-content">
                    <div class="detail-section">
                        <h4>基础信息</h4>
                        <p><strong>来源：</strong>${archive.source || ''}</p>
                        <p><strong>要素：</strong>${archive.element || ''}</p>
                    </div>
                    
                    ${tagsHtml}
                    ${customDataHtml}
                    
                    <div class="detail-section">
                        <h4>录入信息</h4>
                        <p><strong>录入时间：</strong>${archive.createdAt ? new Date(archive.createdAt).toLocaleString() : ''}</p>
                        <p><strong>录入账号：</strong>${archive.createdBy || ''}</p>
                        <p><strong>客户端IP：</strong>${archive.clientIP || ''}</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeArchiveDetail();
            }
        });

        requestAnimationFrame(() => {
            popup.classList.add('active');
        });
    } catch (error) {
        console.error('显示档案详情失败:', error);
        alert('显示档案详情失败：' + error.message);
    }
}

// 关闭档案详情
function closeArchiveDetail() {
    const popup = document.querySelector('.archive-detail-popup');
    if (popup) {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 300);
    }
}

// 添加自定义标签
async function addCustomTag(context) {
    const inputId = context === 'input' ? 'newTag' : 'editNewTag';
    const input = document.getElementById(inputId);
    const tagName = input.value.trim();
    
    if (!tagName) {
        return;
    }

    try {
        // 先创建标签
        const response = await fetchWithAuth('/tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: tagName })
        });

        if (response.ok) {
            // 添加到选标签中
            selectTag(tagName, context);
            input.value = '';
            // 重新加载标签池
            loadTags(context);
        } else {
            const error = await response.json();
            if (error.message === '标签已存���') {
                // 如果标签已存在，直接添加到已选标签中
                selectTag(tagName, context);
                input.value = '';
            } else {
                throw new Error(error.message);
            }
        }
    } catch (error) {
        console.error('添加标签失败:', error);
        alert('添加标签失败：' + error.message);
    }
}

// 添加新标签（管理员功能）
async function addTag() {
    const input = document.getElementById('settingsNewTag');
    const tagName = input.value.trim();
    
    if (!tagName) {
        alert('请输入标签名称');
        return;
    }
    
    try {
        const response = await fetchWithAuth('/tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: tagName })
        });
        
        if (response.ok) {
            alert('标签添加成功');
            input.value = '';
            // 重新加载标签列表和标签池
            await loadTagsList();
            // 重新加载所有页面的标签池
            await loadTags('input');
            await loadTags('search');
            await loadTags('settings');
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        alert('添加标签失败：' + error.message);
    }
}

// 加载标签列表（管理员设置页面使用）
async function loadTagsList() {
    try {
        const response = await fetchWithAuth('/tags');
        if (!response.ok) {
            throw new Error('获取标签失败');
        }
        
        const tags = await response.json();
        const tagsList = document.getElementById('tagsList');
        
        if (!tagsList) {
            console.error('未找到标签列表容器');
            return;
        }
        
        // 清空现有内容
        tagsList.innerHTML = '';
        
        if (tags.length === 0) {
            tagsList.innerHTML = '<div class="no-data">暂无标签</div>';
            return;
        }
        
        // 按使用次数降序排序
        tags.sort((a, b) => b.usageCount - a.usageCount);
        
        // 创建标签列表
        tags.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';
            tagItem.innerHTML = `
                <div class="tag-info">
                    <span class="tag-name">${tag.name}</span>
                    <span class="tag-count">使用次数: ${tag.usageCount}</span>
                </div>
                <button class="delete-tag" data-tag-id="${tag._id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            
            // 为删除按钮添加事件监听器
            const deleteButton = tagItem.querySelector('.delete-tag');
            deleteButton.addEventListener('click', async () => {
                // 检查标签使用次数
                if (tag.usageCount > 0) {
                    alert('该标签正在被使用，请先删除包含该标签的档案或者为对应档案取消该标签');
                    return;
                }
                
                if (confirm(`确定要删除标签"${tag.name}"吗？`)) {
                    try {
                        const response = await fetchWithAuth(`/tags/${tag._id}`, {
                            method: 'DELETE'
                        });
                        
                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message);
                        }
                        
                        // 删除成功后重新加载标签列表
                        loadTagsList();
                        // 重新加载标签池
                        loadTags('input');
                        loadTags('search');
                        
                        // alert('标签删除成功');
                    } catch (error) {
                        console.error('删除标签失败:', error);
                        alert('删除标签失败：' + error.message);
                    }
                }
            });
            
            tagsList.appendChild(tagItem);
        });
    } catch (error) {
        console.error('加载标签列表失败:', error);
        alert('加载标签列表失败：' + error.message);
    }
}

// 切换标签池展示
function toggleTagPool(element) {
    const tagPool = element.closest('.tag-pool');
    const isExpanded = tagPool.classList.toggle('expanded');
    element.textContent = isExpanded ? '收起' : '显示全部';
    
    if (isExpanded) {
        loadAllTags(tagPool);
    }
}

// 加载所有标签
async function loadAllTags(tagPool) {
    try {
        const response = await fetchWithAuth('/tags');
        if (!response.ok) {
            throw new Error('加载标签失败');
        }
        const tags = await response.json();
        
        const grid = tagPool.querySelector('.tag-pool-grid');
        grid.innerHTML = tags.map(tag => `
            <span class="tag" onclick="selectTag('${tag.name}', '${tagPool.id === 'tagPool' ? 'input' : 'edit'}')">
                ${tag.name}
            </span>
        `).join('');
    } catch (error) {
        console.error('加载所有标签失败:', error);
        alert('加载所有标签失败：' + error.message);
    }
}

// 加载档案列表
async function loadArchivesList(page = 1) {
    try {
        // 获取档案列表数据
        const response = await fetchWithAuth(`/archives?page=${page}&limit=10`);
        if (!response.ok) {
            throw new Error('加载档案失败');
        }

        const data = await response.json();
        
        // 构建分��数据
        const pagination = {
            current: parseInt(page),
            pageSize: 10,
            total: Math.ceil((data.total || 0) / 10)
        };

        // 显示档案列表
        displayArchives(data.archives, pagination, 'archivesList', 'listPagination');
    } catch (error) {
        console.error('加载档案列表失败:', error);
        alert('加载档案失败：' + error.message);
    }
}

// 提交档案
async function submitArchive(e) {
    e.preventDefault();
    
    try {
        console.log('开始提交档案...');
        console.log('正在获取表单元素...');
        
        // 获取并记录所有表单元素
        const sourceElement = document.getElementById('source');
        console.log('source元素:', sourceElement);
        
        const elementElement = document.getElementById('element');
        console.log('element元素:', elementElement);
        
        const rawCustomDataElement = document.getElementById('rawCustomData');
        console.log('rawCustomData元素:', rawCustomDataElement);
        
        const selectedTagsContainer = document.getElementById('selectedTags');
        console.log('selectedTags容器:', selectedTagsContainer);
        
        // 检查元素是否存在
        if (!sourceElement || !elementElement || !rawCustomDataElement || !selectedTagsContainer) {
            console.error('表单元素缺失:', {
                sourceExists: !!sourceElement,
                elementExists: !!elementElement,
                rawCustomDataExists: !!rawCustomDataElement,
                selectedTagsExists: !!selectedTagsContainer
            });
            throw new Error('表单元素缺失，请检查页面结构');
        }
        
        // 获取表单数据
        const source = sourceElement.value.trim();
        const element = elementElement.value.trim();
        const rawCustomData = rawCustomDataElement.value.trim();
        
        console.log('表单数据:', {
            source,
            element,
            rawCustomData
        });
        
        // 获取标签数据
        const tags = Array.from(selectedTagsContainer.children)
            .map(tag => tag.textContent.trim())
            .filter(tag => tag);
            
        console.log('已选标签:', tags);
        
        // 验证必填字段
        if (!source || !element) {
            throw new Error('请填写来源和要素');
        }
        
        console.log('准备提交的完整档案数据:', {
            source,
            element,
            rawCustomData,
            tags
        });

        console.log('开始发送请求...');
        const response = await fetchWithAuth('/archives', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source,
                element,
                rawCustomData,
                tags
            })
        });

        console.log('收到响应:', response);
        const responseData = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                // 要素已存在的情况
                const result = confirm('该要素已存在，是否查看已有档案？');
                if (result) {
                    showArchiveDetail(responseData.existingArchive);
                }
                return; // 直接返回，不抛出错误
            }
            throw new Error(responseData.message || '创建档案失败');
        }

        // 清空表单
        console.log('正在清空表单...');
        document.getElementById('archiveForm').reset();
        document.getElementById('selectedTags').innerHTML = '';
        
        // 显示成功消息
        alert('档案创建成功');
        
        // 显示最新创建的档案
        console.log('显示最新创建的档案...');
        showLatestArchive(responseData);
        
        // 重新加载档案列表
        console.log('重新加载档案列表...');
        loadArchivesList(1);
    } catch (error) {
        console.error('提交档案失败:', error);
        console.error('错误堆栈:', error.stack);
        alert('提交失败：' + error.message);
    }
}

// 绑定表单提交事件
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始绑定表单事件...');
    const archiveForm = document.getElementById('archiveForm');
    console.log('找到表单元素:', archiveForm);
    
    if (archiveForm) {
        console.log('绑定表单提交事件...');
        archiveForm.addEventListener('submit', submitArchive);
        console.log('表单提交事件绑定完成');
    } else {
        console.error('未找到表单元素！');
    }
});