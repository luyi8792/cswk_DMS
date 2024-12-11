// 引入必要的模块
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 获取命令行参数
const args = process.argv.slice(2);

// 检查参数数量
if (args.length !== 3) {
    console.error('使用方法: node createUser.js <用户类型(1:管理员/2:普通用户)> <账号> <密码>');
    process.exit(1);
}

// 解析参数
const [userType, username, password] = args;

// 验证用户类型
if (userType !== '1' && userType !== '2') {
    console.error('错误：用户类型必须是 1(管理员) 或 2(普通用户)');
    process.exit(1);
}

// 验证用户名长度
if (username.length < 3) {
    console.error('错误：用户名长度必须大于等于3个字符');
    process.exit(1);
}

// 验证密码长度
if (password.length < 6) {
    console.error('错误：密码长度必须大于等于6个字符');
    process.exit(1);
}

// 连接数据库
mongoose.connect('mongodb://root:zhsbkczj@mongodb-mongodb.ns-5a3vu6yx.svc:27017', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    try {
        console.log('数据库连接成功，开始创建用户...');
        
        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.error('错误：用户名已存在');
            process.exit(1);
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        const user = new User({
            username,
            password: hashedPassword,
            role: userType === '1' ? 'admin' : 'user'
        });

        // 保存用户
        await user.save();
        console.log('用户创建成功！');
        console.log('用户名：', username);
        console.log('用户类型：', userType === '1' ? '管理员' : '普通用户');
        console.log('密码：', password);

    } catch (error) {
        console.error('创建用户失败:', error.message);
    } finally {
        // 关闭数据库连接
        await mongoose.connection.close();
        console.log('数据库连接已关闭');
    }
}).catch(error => {
    console.error('数据库连接失败:', error);
}); 