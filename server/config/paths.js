const path = require('path');

// 定义上传相关的路径
const UPLOAD_PATHS = {
    // 基础上传目录
    BASE_UPLOAD_DIR: path.join(__dirname, '../../public/uploads'),
    // 档案上传目录
    ARCHIVES_UPLOAD_DIR: path.join(__dirname, '../../public/uploads/archives'),
    // URL访问路径前缀
    UPLOAD_URL_PREFIX: '/uploads'
};

module.exports = UPLOAD_PATHS; 