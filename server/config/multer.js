const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../public/uploads/archives');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 根据主档案ID和子档案ID创建目录
        const archiveId = req.params.archiveId;
        const subArchiveId = req.params.subArchiveId || 'temp';
        const dir = path.join(uploadDir, archiveId, subArchiveId);
        
        // 确保目录存在
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // 生成文件名：时间戳 + 随机数 + 原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 检查文件类型
    if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/)) {
        return cb(new Error('只允许上传 JPG、PNG 或 GIF 格式的图片'), false);
    }
    
    // 检查文件大小（在multer配置中设置）
    cb(null, true);
};

// 创建 multer 实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 限制文件大小为2MB
        files: 10 // 限制每次最多上传10个文件
    }
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: '文件大小不能超过2MB' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: '一次最多只能上传10个文件' });
        }
        return res.status(400).json({ message: '文件上传失败：' + err.message });
    }
    
    if (err.message.includes('只允许上传')) {
        return res.status(400).json({ message: err.message });
    }
    
    next(err);
};

module.exports = {
    upload,
    handleUploadError
}; 