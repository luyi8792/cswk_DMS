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
        required: true
    },
    element: {
        type: String,
        required: true
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 重新创建需要的索引
archiveSchema.index({
    source: 'text',
    element: 'text',
    'customData': 'text'
});

module.exports = mongoose.model('Archive', archiveSchema); 