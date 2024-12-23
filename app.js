const express = require('express');
const mongoose = require('mongoose');
const Archive = require('./models/Archive');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { generateToken, verifyToken, isAdmin } = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 连接数据库
mongoose.connect('mongodb://root:zhsbkczj@mongodb-mongodb.ns-5a3vu6yx.svc:27017')
.then(() => {
  console.log('数据库连接成功');
}).catch(error => {
  console.error('数据库连接失败:', error);
});

// 修改解析自定义数据的函数
function parseCustomData(text) {
    const customData = new Map();
    if (!text) return customData;

    // 按行分割文本，过滤空行
    const lines = text.split('\n')
        .map(line => {
            // 替换全角冒号为半角冒号
            return line.trim().replace(/：/g, ':');
        })
        .filter(line => line);
    
    for (let line of lines) {
        // 查找第一个冒号（支持中英文冒号）
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        // 提取键（数据类型）和值，去除首尾空格
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        // 确保键和值都不为空
        if (key && value) {
            // 移除值中的多余空格
            const cleanValue = value.replace(/\s+/g, ' ');
            customData.set(key, cleanValue);
        }
    }

    return customData;
}

// 获取最新档案
app.get('/archives/latest', verifyToken, async (req, res) => {
    try {
        const latestArchive = await Archive.findOne()
            .sort({ createdAt: -1 })
            .limit(1);

        if (!latestArchive) {
            return res.status(404).json({ message: '没有找到档案' });
        }

        res.json(latestArchive);
    } catch (error) {
        console.error('获取最新档案失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取档案列表（分页）
app.get('/archives', verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const archives = await Archive.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Archive.countDocuments();

        res.json({
            archives,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        console.error('获取档案列表失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 搜索档案
app.get('/archives/search', verifyToken, async (req, res) => {
    try {
        const keyword = req.query.keyword;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!keyword) {
            return res.status(400).json({ message: '请输入搜索关键词' });
        }

        const query = {
            $or: [
                { source: { $regex: keyword, $options: 'i' } },
                { element: { $regex: keyword, $options: 'i' } },
                { rawCustomData: { $regex: keyword, $options: 'i' } }
            ]
        };

        const archives = await Archive.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Archive.countDocuments(query);

        res.json({
            archives,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        console.error('搜索档案失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取档案统计信息
app.get('/archives/stats', verifyToken, async (req, res) => {
    try {
        const totalCount = await Archive.countDocuments();
        const latestArchive = await Archive.findOne()
            .sort({ createdAt: -1 })
            .select('createdAt');

        res.json({
            totalCount,
            latestArchiveTime: latestArchive ? latestArchive.createdAt : null
        });
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 修改档案
app.put('/archives/:id', verifyToken, async (req, res) => {
    try {
        const { rawCustomData } = req.body;

        const archive = await Archive.findById(req.params.id);
        
        if (!archive) {
            return res.status(404).json({ message: '档案不存在' });
        }

        // 检查权限：只有管理员或创建者可以修改
        if (req.user.role !== 'admin' && archive.createdBy !== req.user.username) {
            return res.status(403).json({ message: '没有权限修改此档案' });
        }

        // 解析自定义数据
        const customData = parseCustomData(rawCustomData);

        // 只更新自定义数据部分，保持其他字段不变
        archive.customData = Object.fromEntries(customData);
        archive.rawCustomData = rawCustomData;

        // 保存更新
        const updatedArchive = await archive.save({ validateModifiedOnly: true });
        res.json(updatedArchive);
    } catch (error) {
        console.error('修改档案失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除档案（仅管理员）
app.delete('/archives/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const archive = await Archive.findByIdAndDelete(req.params.id);
        if (!archive) {
            return res.status(404).json({ message: '档案不存在' });
        }
        res.json({ message: '档案已删除' });
    } catch (error) {
        console.error('删除档案失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 修改录入档案的路由
app.post('/archives', verifyToken, async (req, res) => {
    try {
        const { source, element, rawCustomData } = req.body;
        
        // 获取客户端IP地址
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        req.connection.socket.remoteAddress;
        
        // 解析定义数据
        const customData = parseCustomData(rawCustomData);
        
        // 创建新档案
        const archive = new Archive({
            source,
            element,
            customData: Object.fromEntries(customData),
            rawCustomData,
            // 添加录入信息
            createdBy: req.user.username,  // 从 token 中获取用户名
            clientIP: clientIP
        });
        
        const savedArchive = await archive.save();
        res.status(201).json(savedArchive);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 添加获取单个档案的路由
app.get('/archives/:id', async (req, res) => {
  try {
    const archive = await Archive.findById(req.params.id);
    if (!archive) {
      return res.status(404).json({ message: '档案不存在' });
    }
    res.json(archive);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 用户注册
app.post('/auth/register', async (req, res) => {
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
});

// 用户登录
app.post('/auth/login', async (req, res) => {
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 