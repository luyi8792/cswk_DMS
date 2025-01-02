const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// 用户注册
const register = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // 检查用户是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            username,
            password: hashedPassword,
            role: role || 'user'
        });

        await user.save();
        res.status(201).json({ message: '注册成功' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 用户登录
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('登录请求:', { username });
        
        const user = await User.findOne({ username });
        if (!user) {
            console.log('用户不存在:', username);
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        console.log('找到用户:', { username, role: user.role });
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('密码验证结果:', isValidPassword);

        if (!isValidPassword) {
            console.log('密码错误');
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        const token = generateToken(user);
        console.log('登录成功，生成token');
        res.json({ token, role: user.role });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    register,
    login
}; 