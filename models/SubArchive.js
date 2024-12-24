const mongoose = require('mongoose');

const subArchiveSchema = new mongoose.Schema({
    // 关联的主档案
    parentArchive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Archive',
        required: true,
        index: true
    },
    // 子档案内容
    content: {
        type: String,
        required: true,
        maxlength: [5000, '内容长度不能超过5000个字符']
    },
    // 图片信息
    images: [{
        filename: {        // 原始文件名
            type: String,
            required: true
        },
        path: {           // 相对路径
            type: String,
            required: true
        },
        size: {           // 文件大小（字节）
            type: Number,
            required: true
        },
        mimetype: {       // 文件类型
            type: String,
            required: true,
            enum: ['image/jpeg', 'image/png', 'image/gif']
        },
        uploadedAt: {     // 上传时间
            type: Date,
            default: Date.now
        }
    }],
    // 录入信息
    createdBy: {          // 录入账号
        type: String,
        required: true
    },
    createdAt: {          // 录入时间
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true      // 自动管理创建和更新时间
});

// 创建索引
subArchiveSchema.index({ parentArchive: 1, createdAt: -1 });
subArchiveSchema.index({ createdBy: 1 });

// 添加虚拟字段：图片数量
subArchiveSchema.virtual('imageCount').get(function() {
    return this.images ? this.images.length : 0;
});

// 配置toJSON选项
subArchiveSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        delete ret._id;
        return ret;
    }
});

const SubArchive = mongoose.model('SubArchive', subArchiveSchema);

module.exports = SubArchive; 