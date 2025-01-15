const mongoose = require('mongoose');
const { DB_CONFIG } = require('./index');

const connectDB = async () => {
    try {
        await mongoose.connect(DB_CONFIG.URL, DB_CONFIG.OPTIONS);
        console.log('数据库连接成功');
    } catch (error) {
        console.error('数据库连接失败:', error);
        process.exit(1);
    }
};

module.exports = connectDB; 