const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key'; // 在实际应用中应该使用环境变量

exports.generateToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

exports.verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: '未登录' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: '登录已过期，请重新登录' });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '权限不足' });
    }
    next();
}; 