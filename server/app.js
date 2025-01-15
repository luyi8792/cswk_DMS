const express = require('express');
const path = require('path');
const connectDB = require('./config/database');
const { handleUploadError } = require('./config/multer');
const { SERVER_CONFIG, UPLOAD_CONFIG } = require('./config/index');

const app = express();
app.use(express.json());

// 配置静态文件服务
app.use(express.static(path.join(__dirname, '../client')));
app.use(UPLOAD_CONFIG.UPLOAD_URL_PREFIX, express.static(UPLOAD_CONFIG.BASE_UPLOAD_DIR));

// 错误处理中间件
app.use(handleUploadError);

// 连接数据库
connectDB();

// 路由
app.use('/auth', require('./routes/authRoutes'));
app.use('/archives', require('./routes/archiveRoutes'));
app.use('/tags', require('./routes/tagRoutes'));
app.use('/archives', require('./routes/subArchiveRoutes'));

// 所有路由都返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/html/index.html'));
});

app.listen(SERVER_CONFIG.PORT, () => {
    console.log(`服务器运行在端口:${SERVER_CONFIG.PORT}`);
}); 