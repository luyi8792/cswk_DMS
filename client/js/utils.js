// 文本截断函数
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

// 带认证的fetch请求
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
