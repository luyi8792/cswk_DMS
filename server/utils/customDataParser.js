// 解析自定义数据的函数
function parseCustomData(text) {
    const customData = new Map();
    if (!text) return customData;

    // 按行分割文本，过滤空行
    const lines = text.split('\n')
        .map(line => {
            // 替换全角冒号为半角冒号
            return line.trim().replace(/：/g, ':');
        })
        .filter(line => line);
    
    for (let line of lines) {
        // 查找第一个冒号（支持中英文冒号）
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        // 提取键（数据类型）和值，去除首尾空格
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        // 确保键和值都不为空
        if (key && value) {
            // 移除值中的多余空格
            const cleanValue = value.replace(/\s+/g, ' ');
            customData.set(key, cleanValue);
        }
    }

    return customData;
}

module.exports = {
    parseCustomData
}; 