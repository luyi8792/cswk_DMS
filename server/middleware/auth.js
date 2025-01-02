const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your-secret-key'; // 在生产环境中应该使用环境变量

// 生成JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id,
            username: user.username,
            role: user.role 
        },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
};

// 验证token的中间件
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: '未提供认证token' });
    }
    
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: '无效的token' });
    }
};

// 检查管理员权限的中间件
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '需要管理员权限' });
    }
    next();
};

module.exports = {
    generateToken,
    verifyToken,
    isAdmin
}; 