const mongoose = require('mongoose');

// 在定义新的 Schema 之前，删除所有已存在的索引
mongoose.connection.on('connected', async () => {
    try {
        await mongoose.connection.db.collection('archives').dropIndexes();
    } catch (error) {
        console.log('No indexes to drop');
    }
});

const archiveSchema = new mongoose.Schema({
    // 基础数据
    source: {
        type: String,
        required: true,
        maxlength: [64, '来源长度不能超过64个字符']
    },
    element: {
        type: String,
        required: true,
        maxlength: [64, '要素长度不能超过64个字符']
    },
    // 自定义数据
    customData: {
        type: Map,
        of: String,
        default: new Map()
    },
    // 保存原始文本
    rawCustomData: {
        type: String,
        default: ''
    },
    // 标签
    tags: [{
        type: String,
        ref: 'Tag'
    }],
    // 录入信息
    createdBy: {          // 录入账号
        type: String,
        required: true
    },
    createdAt: {          // 录入时间
        type: Date,
        default: Date.now
    },
    clientIP: {           // 客户端IP
        type: String,
        required: true
    }
});

// 重新创建需要的索引
archiveSchema.index({
    source: 'text',
    element: 'text',
    'customData': 'text'
});

module.exports = mongoose.model('Archive', archiveSchema); 