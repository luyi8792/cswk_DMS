// 引入必要的模块
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { DB_CONFIG } = require('../server/config/index');

// 检查命令行参数
if (process.argv.length !== 5) {
    console.error('用法: node createUser.js <用户名> <密码> <用户类型(admin/user)>');
    process.exit(1);
}

const [,, username, password, role] = process.argv;

// 验证用户类型
if (role !== 'admin' && role !== 'user') {
    console.error('错误: 用户类型必须是 "admin" 或 "user"');
    process.exit(1);
}

// 用户模型
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

async function addUser() {
    try {
        // 连接数据库
        await mongoose.connect(DB_CONFIG.URL, DB_CONFIG.OPTIONS);
        console.log('数据库连接成功');

        // 检查用户是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.error('错误: 用户名已存在');
            process.exit(1);
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        const user = new User({
            username,
            password: hashedPassword,
            role
        });

        await user.save();
        console.log('用户创建成功');
        process.exit(0);
    } catch (error) {
        console.error('错误:', error.message);
        process.exit(1);
    }
}

addUser(); 