const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://root:zhsbkczj@mongodb-mongodb.ns-5a3vu6yx.svc:27017');
        console.log('数据库连接成功');
    } catch (error) {
        console.error('数据库连接失败:', error);
        process.exit(1);
    }
};

module.exports = connectDB; 