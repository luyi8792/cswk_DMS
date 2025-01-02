// 加载首页统计信息
async function loadHomeStats() {
    try {
        const response = await fetchWithAuth('/archives/stats');
        if (!response.ok) {
            throw new Error('获取统计信息失败');
        }

        const stats = await response.json();
        
        document.getElementById('totalArchives').textContent = stats.totalCount || '0';
        
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

// 创建档案元素
function createArchiveElement(archive, number) {
    const archiveItem = document.createElement('div');
    archiveItem.className = 'archive-item';

    const content = document.createElement('div');
    content.className = 'archive-content';

    const numberElement = document.createElement('div');
    numberElement.className = 'archive-number';
    numberElement.textContent = String(number).padStart(2, '0');

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

    content.innerHTML += `
        <div class="creation-info">
            <p><strong>录入账号：</strong>${archive.createdBy || ''}</p>
            <p><strong>录入时间：</strong>${archive.createdAt ? new Date(archive.createdAt).toLocaleString() : ''}</p>
        </div>
    `;

    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';

    const detailButton = document.createElement('button');
    detailButton.className = 'detail-btn';
    detailButton.innerHTML = '<i class="fas fa-info-circle"></i> 详情';
    detailButton.onclick = () => showArchiveDetail(archive._id);

    const editButton = document.createElement('button');
    editButton.className = 'edit-btn';
    editButton.innerHTML = '<i class="fas fa-edit"></i> 修改';
    editButton.onclick = () => showEditDialog(archive._id);

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

// 加载档案列表
async function loadArchivesList(page = 1) {
    try {
        const response = await fetchWithAuth(`/archives?page=${page}&limit=10`);
        if (!response.ok) {
            throw new Error('加载档案失败');
        }

        const data = await response.json();
        const pagination = {
            current: parseInt(page),
            pageSize: 10,
            total: Math.ceil((data.total || 0) / 10)
        };

        displayArchives(data.archives, pagination, 'archivesList', 'listPagination');
    } catch (error) {
        console.error('加载档案列表失败:', error);
        alert('加载档案失败：' + error.message);
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
    
    archives.forEach((archive, index) => {
        const number = pagination ? (pagination.current - 1) * pagination.pageSize + index + 1 : index + 1;
        const archiveElement = createArchiveElement(archive, number);
        container.appendChild(archiveElement);
    });

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

// 搜索档案
async function searchArchives(page = 1) {
    try {
        const keyword = document.getElementById('searchInput').value.trim();
        const selectedTagsContainer = document.getElementById('searchSelectedTags');
        const selectedTags = Array.from(selectedTagsContainer.children)
            .map(tag => tag.textContent.trim())
            .filter(tag => tag);
        
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
        
        if (!data || !Array.isArray(data.archives)) {
            throw new Error('返回的数据格式不正确');
        }
        
        const pagination = {
            current: parseInt(page),
            pageSize: 10,
            total: Math.ceil((data.total || 0) / 10)
        };

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

// 提交档案
async function submitArchive(e) {
    e.preventDefault();
    
    try {
        console.log('开始提交档案...');
        
        const source = document.getElementById('source').value.trim();
        const element = document.getElementById('element').value.trim();
        const rawCustomData = document.getElementById('rawCustomData').value.trim();
        const selectedTagsContainer = document.getElementById('selectedTags');
        
        if (!source || !element) {
            throw new Error('请填写来源和要素');
        }
        
        const tags = Array.from(selectedTagsContainer.children)
            .map(tag => tag.textContent.trim())
            .filter(tag => tag);

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

        const responseData = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                const result = confirm('该要素已存在，是否查看已有档案？');
                if (result) {
                    showArchiveDetail(responseData.existingArchive);
                }
                return;
            }
            throw new Error(responseData.message || '创建档案失败');
        }

        const archiveId = responseData._id;
        
        // 提交子档案
        const subArchiveItems = document.querySelectorAll('.sub-archive-item');
        for (const item of subArchiveItems) {
            const content = item.querySelector('.sub-archive-text').value.trim();
            if (!content) continue;
            
            const formData = new FormData();
            formData.append('content', content);
            
            const imageItems = item.querySelectorAll('.image-preview-item img');
            
            for (const img of imageItems) {
                const file = await fetch(img.src)
                    .then(res => res.blob())
                    .then(blob => new File([blob], `image-${Date.now()}.jpg`, { type: 'image/jpeg' }));
                
                formData.append('images', file);
            }
            
            try {
                const subArchiveResponse = await fetchWithAuth(`/archives/${archiveId}/subArchives`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!subArchiveResponse.ok) {
                    console.error('子档案创建失败:', await subArchiveResponse.json());
                }
            } catch (error) {
                console.error('子档案提交失败:', error);
            }
        }
        
        document.getElementById('archiveForm').reset();
        document.getElementById('selectedTags').innerHTML = '';
        document.getElementById('subArchives').innerHTML = '';
        
        alert('档案创建成功');
        showLatestArchive(responseData);
        loadArchivesList(1);
    } catch (error) {
        console.error('提交档案失败:', error);
        console.error('错误堆栈:', error.stack);
        alert('提交失败：' + error.message);
    }
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
        }, 300);
    }
}

// 显示档案详情
async function showArchiveDetail(archiveIdOrObject) {
    try {
        let archive;
        
        if (typeof archiveIdOrObject === 'string') {
            const response = await fetchWithAuth(`/archives/${archiveIdOrObject}`);
            if (!response.ok) {
                throw new Error('获取档案详情失败');
            }
            archive = await response.json();
        } else {
            archive = archiveIdOrObject;
        }
        
        const popup = document.createElement('div');
        popup.className = 'archive-detail-popup';
        
        const tagsHtml = archive.tags && archive.tags.length > 0 
            ? `<div class="detail-section">
                <h4>标签</h4>
                <div class="archive-tags">
                    ${archive.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
               </div>`
            : '';
            
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
        loadArchivesList(1);
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

        loadArchives();
        alert('删除成功');
    } catch (error) {
        console.error('删除档案失败:', error);
        alert('删除档案失败，请重试');
    }
}

// 子档案相关功能
function addSubArchive() {
    const subArchivesContainer = document.getElementById('subArchives');
    const subArchiveItem = document.createElement('div');
    subArchiveItem.className = 'sub-archive-item';
    
    const itemId = Date.now();
    
    subArchiveItem.innerHTML = `
        <div class="sub-archive-content">
            <textarea class="sub-archive-text" placeholder="请输入子档案内容" rows="4"></textarea>
            <div class="sub-archive-images">
                <label for="file-${itemId}">
                    <i class="fas fa-image"></i> 选择图片
                </label>
                <input type="file" id="file-${itemId}" class="sub-archive-file" accept="image/jpeg,image/png,image/gif" multiple>
                <div class="image-preview"></div>
            </div>
        </div>
        <button type="button" class="remove-sub-archive" onclick="removeSubArchive(this)">
            <i class="fas fa-trash"></i> 删除
        </button>
    `;
    
    subArchivesContainer.appendChild(subArchiveItem);
    
    const fileInput = subArchiveItem.querySelector('.sub-archive-file');
    fileInput.addEventListener('change', handleImageSelect);
}

function removeSubArchive(button) {
    const subArchiveItem = button.closest('.sub-archive-item');
    subArchiveItem.remove();
}

function handleImageSelect(event) {
    const files = event.target.files;
    const preview = event.target.parentElement.querySelector('.image-preview');
    preview.innerHTML = '';
    
    for (const file of files) {
        if (!file.type.match('image.*')) {
            continue;
        }
        
        const reader = new FileReader();
        const imagePreviewItem = document.createElement('div');
        imagePreviewItem.className = 'image-preview-item';
        
        reader.onload = (function(imageItem) {
            return function(e) {
                imageItem.innerHTML = `
                    <img src="${e.target.result}" alt="预览图片">
                    <span class="remove-image" onclick="removeImage(this)">
                        <i class="fas fa-times"></i>
                    </span>
                `;
            };
        })(imagePreviewItem);
        
        reader.readAsDataURL(file);
        preview.appendChild(imagePreviewItem);
    }
}

function removeImage(button) {
    const imageItem = button.closest('.image-preview-item');
    imageItem.remove();
}

// 绑定表单提交事件
document.addEventListener('DOMContentLoaded', () => {
    const archiveForm = document.getElementById('archiveForm');
    if (archiveForm) {
        archiveForm.addEventListener('submit', submitArchive);
    }
});
