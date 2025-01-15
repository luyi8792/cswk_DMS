const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_CONFIG } = require('./index');

// 确保上传目录存在
console.log("上传目录：" + UPLOAD_CONFIG.ARCHIVES_UPLOAD_DIR);
if (!fs.existsSync(UPLOAD_CONFIG.ARCHIVES_UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_CONFIG.ARCHIVES_UPLOAD_DIR, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 根据主档案ID和子档案ID创建目录
        const archiveId = req.params.archiveId;
        const subArchiveId = req.params.subArchiveId || 'temp';
        const dir = path.join(UPLOAD_CONFIG.ARCHIVES_UPLOAD_DIR, archiveId, subArchiveId);
        
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
    if (!file.mimetype.match(UPLOAD_CONFIG.ALLOWED_MIME_TYPES)) {
        return cb(new Error('只允许上传 JPG、PNG 或 GIF 格式的图片'), false);
    }
    cb(null, true);
};

// 创建 multer 实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: UPLOAD_CONFIG.FILE_LIMITS
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: `文件大小不能超过${UPLOAD_CONFIG.FILE_LIMITS.fileSize / (1024 * 1024)}MB` });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: `一次最多只能上传${UPLOAD_CONFIG.FILE_LIMITS.files}个文件` });
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