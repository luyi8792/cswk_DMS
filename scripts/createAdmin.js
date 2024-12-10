const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 连接数据库
mongoose.connect('mongodb://root:zhsbkczj@mongodb-mongodb.ns-5a3vu6yx.svc:27017', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    try {
        console.log('数据库连接成功，开始创建管理员账户...');
        
        // 设置管理员账户信息
        const adminUser = {
            username: 'admin',
            password: 'admin123',
            role: 'admin'
        };

        // 检查是否已存在管理员账户
        const existingAdmin = await User.findOne({ username: adminUser.username });
        if (existingAdmin) {
            console.log('管理员账户已存在，无需重新创建');
            // 更新管理员密码
            const hashedPassword = await bcrypt.hash(adminUser.password, 10);
            existingAdmin.password = hashedPassword;
            await existingAdmin.save();
            console.log('管理员密码已更新');
            console.log('用户名：admin');
            console.log('密码：admin123');
            process.exit(0);
        }

        // 创建新管理员账户
        const hashedPassword = await bcrypt.hash(adminUser.password, 10);
        const admin = new User({
            username: adminUser.username,
            password: hashedPassword,
            role: adminUser.role
        });

        await admin.save();
        console.log('管理员账户创建成功');
        console.log('用户名：admin');
        console.log('密码：admin123');
    } catch (error) {
        console.error('创建管理员账户失败:', error);
    } finally {
        await mongoose.connection.close();
        console.log('数据库连接已关闭');
    }
}).catch(error => {
    console.error('数据库连接失败:', error);
}); 