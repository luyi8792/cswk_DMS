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
        tagPoolGrid.innerHTML = tags.map(tag => `
            <span class="tag" onclick="selectTag('${tag.name}', '${context}')">
                ${tag.name}
            </span>
        `).join('');
        
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
    
    const existingTag = Array.from(selectedTagsContainer.children)
        .find(tag => tag.textContent.trim() === tagName);
    
    if (existingTag) return;
    
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
    
    selectedTagsContainer.appendChild(tagElement);
    updateSelectedTags(context);
    
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
    
    const selectedTags = Array.from(selectedTagsContainer.children)
        .map(tag => tag.textContent.trim());
    
    selectedTagsInput.value = JSON.stringify(selectedTags);
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
        const response = await fetchWithAuth('/tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: tagName })
        });

        if (response.ok) {
            selectTag(tagName, context);
            input.value = '';
            loadTags(context);
        } else {
            const error = await response.json();
            if (error.message === '标签已存在') {
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
        
        tagsList.innerHTML = '';
        
        if (tags.length === 0) {
            tagsList.innerHTML = '<div class="no-data">暂无标签</div>';
            return;
        }
        
        tags.sort((a, b) => b.usageCount - a.usageCount);
        
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
            
            const deleteButton = tagItem.querySelector('.delete-tag');
            deleteButton.addEventListener('click', async () => {
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
                        
                        loadTagsList();
                        loadTags('input');
                        loadTags('search');
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
            await loadTagsList();
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
