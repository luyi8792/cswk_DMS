const path = require('path');

// 服务器配置
const SERVER_CONFIG = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || 'localhost'
};

// 数据库配置
const DB_CONFIG = {
    URL: process.env.MONGODB_URL || 'mongodb://root:zhsbkczj@mongodb-mongodb.ns-5a3vu6yx.svc:27017',
    OPTIONS: {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
};

// 上传路径配置
const UPLOAD_CONFIG = {
    // 基础上传目录
    BASE_UPLOAD_DIR: path.join(__dirname, '../../public/uploads'),
    // 档案上传目录
    ARCHIVES_UPLOAD_DIR: path.join(__dirname, '../../public/uploads/archives'),
    // URL访问路径前缀
    UPLOAD_URL_PREFIX: '/uploads',
    // 文件上传限制
    FILE_LIMITS: {
        fileSize: 20 * 1024 * 1024, // 20MB
        files: 10 // 最多10个文件
    },
    // 允许的文件类型
    ALLOWED_MIME_TYPES: /^image\/(jpeg|png|gif)$/
};

module.exports = {
    SERVER_CONFIG,
    DB_CONFIG,
    UPLOAD_CONFIG
}; 