const express = require('express');
const mongoose = require('mongoose');
const Archive = require('./models/Archive');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { generateToken, verifyToken, isAdmin } = require('./middleware/auth');
const Tag = require('./models/Tag');
const path = require('path');
const multer = require('multer');
const SubArchive = require('./models/SubArchive');

const app = express();
app.use(express.json());

// 配置静态文件服务
// 为网站的静态资源（HTML、CSS、JS等）提供服务
app.use(express.static('public'));

// 为上传的档案图片提供服务
// 注意：这里使用 /uploads 作为URL前缀，对应到 public/uploads 目录
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 确保上传目录存在
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public/uploads/archives');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 根据主档案ID和子档案ID创建目录
        const archiveId = req.params.archiveId;
        const subArchiveId = req.params.subArchiveId || 'temp';
        const dir = path.join(uploadDir, archiveId, subArchiveId);
        
        // 确保目录存在
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // 生成文件名：时间戳 + 随机数 + 原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 检查文件类型
    if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/)) {
        return cb(new Error('只允许上传 JPG、PNG 或 GIF 格式的图片'), false);
    }
    
    // 检查文件大小（在multer配置中设置）
    cb(null, true);
};

// 创建 multer 实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 限制文件大小为2MB
        files: 10 // 限制每次最多上传10个文件
    }
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: '文件大小不能超过2MB' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: '一次最多只能上传10个文件' });
        }
        return res.status(400).json({ message: '文件上传失败：' + err.message });
    }
    
    if (err.message.includes('只允许上传')) {
        return res.status(400).json({ message: err.message });
    }
    
    next(err);
};

app.use(handleUploadError);

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

        console.log('正在获取档案列表，参数:', { page, limit, skip });

        const archives = await Archive.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Archive.countDocuments();

        console.log('档案列表获取成功，数据:', {
            total,
            archivesCount: archives.length,
            sampleArchive: archives[0] ? {
                id: archives[0]._id,
                source: archives[0].source,
                tags: archives[0].tags,
                customData: archives[0].customData
            } : null
        });

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // 构建查询条件
        const query = {};
        
        // 处理关键词搜索
        if (req.query.keyword) {
            const keyword = req.query.keyword.trim();
            query.$or = [
                { source: { $regex: keyword, $options: 'i' } },
                { element: { $regex: keyword, $options: 'i' } },
                { rawCustomData: { $regex: keyword, $options: 'i' } }
            ];
        }
        
        // 处理标签筛选
        if (req.query.tags) {
            const tags = req.query.tags.split(',').map(tag => tag.trim());
            if (tags.length > 0) {
                if (query.$or) {
                    // 如果已经有关键词搜索条件，使用 $and 组合条件
                    query.$and = [
                        { $or: query.$or },
                        { tags: { $all: tags } }
                    ];
                    delete query.$or;
                } else {
                    // 如果只有标签筛选，直接使用 $all
                    query.tags = { $all: tags };
                }
            }
        }

        // 获取总数
        const total = await Archive.countDocuments(query);
        
        // 获取分页数据
        const archives = await Archive.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            total,
            archives
        });
    } catch (error) {
        console.error('搜索档案失败:', error);
        res.status(500).json({ message: '搜索档案失败：' + error.message });
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
        console.error('获取计信息失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 修改档案
app.put('/archives/:id', verifyToken, async (req, res) => {
    try {
        const { rawCustomData, tags } = req.body;

        const archive = await Archive.findById(req.params.id);
        
        if (!archive) {
            return res.status(404).json({ message: '档案不存在' });
        }

        // 检查权限：只有管理员或创建者可以修改
        if (req.user.role !== 'admin' && archive.createdBy !== req.user.username) {
            return res.status(403).json({ message: '没有权限修改此档案' });
        }

        // 处理标签
        if (tags) {
            // 更新标签使用次数
            const removedTags = archive.tags.filter(tag => !tags.includes(tag));
            const addedTags = tags.filter(tag => !archive.tags.includes(tag));

            if (removedTags.length > 0) {
                await Tag.updateMany(
                    { name: { $in: removedTags } },
                    { $inc: { usageCount: -1 } }
                );
            }

            if (addedTags.length > 0) {
                await Tag.updateMany(
                    { name: { $in: addedTags } },
                    { $inc: { usageCount: 1 } }
                );

                // 对于新标签，创建新的标签记录
                const existingTags = await Tag.find({ name: { $in: addedTags } });
                const existingTagNames = existingTags.map(tag => tag.name);
                const newTags = addedTags.filter(tag => !existingTagNames.includes(tag));

                if (newTags.length > 0) {
                    await Tag.insertMany(newTags.map(name => ({
                        name,
                        usageCount: 1,
                        createdBy: req.user.username
                    })));
                }
            }
        }

        // 解析自定义数据
        const customData = parseCustomData(rawCustomData);

        // 更新档案
        archive.customData = Object.fromEntries(customData);
        archive.rawCustomData = rawCustomData;
        archive.tags = tags || archive.tags;

        const updatedArchive = await archive.save();
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
        console.log('接收到的档案数据:', req.body);
        const { source, element, rawCustomData } = req.body;
        
        // 检查要素是否已存在
        const existingArchive = await Archive.findOne({ element: element });
        if (existingArchive) {
            return res.status(409).json({
                message: '要素已存在',
                existingArchive: existingArchive
            });
        }
        
        // 处理标签数据
        let tags = [];
        try {
            // 从请求体中获取标签数据，可能是JSON字符串
            const tagsData = req.body.tags;
            tags = typeof tagsData === 'string' ? JSON.parse(tagsData) : tagsData;
            console.log('解析后的标签数据:', tags);
        } catch (error) {
            console.error('解析标签数据失败:', error);
            tags = [];
        }
        
        // 获取客户端IP地址
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        req.connection.socket.remoteAddress;
        
        // 解析自定义数据
        const customData = parseCustomData(rawCustomData);
        
        // 处理标签
        const validTags = [];
        if (Array.isArray(tags)) {
            console.log('开始处理标签...');
            for (const tagName of tags) {
                console.log('处理标签:', tagName);
                // 查找标签是否存在
                let tag = await Tag.findOne({ name: tagName });
                if (!tag) {
                    console.log('创建新标签:', tagName);
                    // 如果标签不存在，创建新标签
                    tag = new Tag({
                        name: tagName,
                        usageCount: 0,
                        createdBy: req.user.username
                    });
                    await tag.save();
                }
                // 增加使用次数
                console.log('更新标签使用次数:', tagName);
                await Tag.updateOne(
                    { _id: tag._id },
                    { $inc: { usageCount: 1 } }
                );
                validTags.push(tagName);
            }
        }
        
        console.log('最终��效标签:', validTags);
        
        // 创建新档案
        const archive = new Archive({
            source,
            element,
            customData: Object.fromEntries(customData),
            rawCustomData,
            tags: validTags,
            createdBy: req.user.username,
            clientIP: clientIP
        });
        
        const savedArchive = await archive.save();
        console.log('保存的档案数据:', {
            id: savedArchive._id,
            source: savedArchive.source,
            tags: savedArchive.tags
        });
        
        res.status(201).json(savedArchive);
    } catch (error) {
        console.error('创建档案失败:', error);
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

// 用登录
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

// 获取所有标签
app.get('/tags', verifyToken, async (req, res) => {
    try {
        const tags = await Tag.find().sort({ usageCount: -1 });
        res.json(tags);
    } catch (error) {
        console.error('获取标签失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加新标签（管理员功能）
app.post('/tags', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: '标签名称不能为空' });
        }

        const trimmedName = name.trim();
        
        // 检查标签是否已存在
        const existingTag = await Tag.findOne({ name: trimmedName });
        if (existingTag) {
            return res.status(400).json({ message: '标签已存在' });
        }
        
        const tag = new Tag({
            name: trimmedName,
            usageCount: 0,
            createdBy: req.user.username
        });
        
        const savedTag = await tag.save();
        res.status(201).json(savedTag);
    } catch (error) {
        console.error('添加标签失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除标签（管理员功能）
app.delete('/tags/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const tag = await Tag.findByIdAndDelete(req.params.id);
        if (!tag) {
            return res.status(404).json({ message: '标签不存在' });
        }
        
        // 从所有使用该标签的档案中移除
        await Archive.updateMany(
            { tags: tag.name },
            { $pull: { tags: tag.name } }
        );
        
        res.json({ message: '标签已删除' });
    } catch (error) {
        console.error('删除标签失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 子档案相关路由

// 创建子档案
app.post('/archives/:archiveId/subArchives', verifyToken, upload.array('images', 10), async (req, res) => {
    try {
        const { archiveId } = req.params;
        const { content } = req.body;
        
        // 检查主档案是否存在
        const archive = await Archive.findById(archiveId);
        if (!archive) {
            return res.status(404).json({ message: '主档���不存在' });
        }
        
        // 检查权限：只有管理员或创建者可以添加子档案
        if (req.user.role !== 'admin' && archive.createdBy !== req.user.username) {
            return res.status(403).json({ message: '没有权限添加子档案' });
        }
        
        // 处理上传的图片
        const images = req.files.map(file => ({
            filename: file.originalname,
            path: path.relative(path.join(__dirname, 'public'), file.path),
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date()
        }));
        
        // 创建子档案
        const subArchive = new SubArchive({
            parentArchive: archiveId,
            content,
            images,
            createdBy: req.user.username
        });
        
        // 保存子档案
        const savedSubArchive = await subArchive.save();
        
        // 更新主档案的子档案列表
        archive.subArchives.push(savedSubArchive._id);
        await archive.save();
        
        res.status(201).json(savedSubArchive);
    } catch (error) {
        console.error('创建子档案失败:', error);
        res.status(500).json({ message: '创建子档案失败：' + error.message });
    }
});

// 获取子档案列表
app.get('/archives/:archiveId/subArchives', verifyToken, async (req, res) => {
    try {
        const { archiveId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // 获取子档案总数
        const total = await SubArchive.countDocuments({ parentArchive: archiveId });
        
        // 获取分页数据
        const subArchives = await SubArchive.find({ parentArchive: archiveId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        res.json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            subArchives
        });
    } catch (error) {
        console.error('获取子档案列表失败:', error);
        res.status(500).json({ message: '获取子档案列表失败：' + error.message });
    }
});

// 获取单个子档案
app.get('/archives/:archiveId/subArchives/:subArchiveId', verifyToken, async (req, res) => {
    try {
        const { archiveId, subArchiveId } = req.params;
        
        const subArchive = await SubArchive.findOne({
            _id: subArchiveId,
            parentArchive: archiveId
        });
        
        if (!subArchive) {
            return res.status(404).json({ message: '子档案不存在' });
        }
        
        res.json(subArchive);
    } catch (error) {
        console.error('获取子档案失败:', error);
        res.status(500).json({ message: '获取子档案失败：' + error.message });
    }
});

// 更新子档案
app.put('/archives/:archiveId/subArchives/:subArchiveId', verifyToken, upload.array('images', 10), async (req, res) => {
    try {
        const { archiveId, subArchiveId } = req.params;
        const { content } = req.body;
        
        // 查找子档案
        const subArchive = await SubArchive.findOne({
            _id: subArchiveId,
            parentArchive: archiveId
        });
        
        if (!subArchive) {
            return res.status(404).json({ message: '子档案不存在' });
        }
        
        // 检查权限
        if (req.user.role !== 'admin' && subArchive.createdBy !== req.user.username) {
            return res.status(403).json({ message: '没有权限修改此子档案' });
        }
        
        // 处理新上传的图片
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                filename: file.originalname,
                path: path.relative(path.join(__dirname, 'public'), file.path),
                size: file.size,
                mimetype: file.mimetype,
                uploadedAt: new Date()
            }));
            
            // 添加新图片到现有图片列表
            subArchive.images.push(...newImages);
        }
        
        // 更新内容
        if (content) {
            subArchive.content = content;
        }
        
        // 保存更新
        const updatedSubArchive = await subArchive.save();
        res.json(updatedSubArchive);
    } catch (error) {
        console.error('更新子档案失败:', error);
        res.status(500).json({ message: '更新子档案失败：' + error.message });
    }
});

// 删除子档案
app.delete('/archives/:archiveId/subArchives/:subArchiveId', verifyToken, async (req, res) => {
    try {
        const { archiveId, subArchiveId } = req.params;
        
        // 查找子档案
        const subArchive = await SubArchive.findOne({
            _id: subArchiveId,
            parentArchive: archiveId
        });
        
        if (!subArchive) {
            return res.status(404).json({ message: '子档案不存在' });
        }
        
        // 检查权限
        if (req.user.role !== 'admin' && subArchive.createdBy !== req.user.username) {
            return res.status(403).json({ message: '没有权限删除此子档案' });
        }
        
        // 删除相关的图片文件
        for (const image of subArchive.images) {
            const imagePath = path.join(__dirname, 'public', image.path);
            try {
                await fs.promises.unlink(imagePath);
            } catch (err) {
                console.error('删除图片文件失败:', err);
            }
        }
        
        // 从主档案中移除子档案引用
        await Archive.findByIdAndUpdate(archiveId, {
            $pull: { subArchives: subArchiveId }
        });
        
        // 删除子档案记录
        await SubArchive.findByIdAndDelete(subArchiveId);
        
        res.json({ message: '子档案已删除' });
    } catch (error) {
        console.error('删除子档案失败:', error);
        res.status(500).json({ message: '删除子档案失败：' + error.message });
    }
});

// 删除子档案图片
app.delete('/archives/:archiveId/subArchives/:subArchiveId/images/:imageId', verifyToken, async (req, res) => {
    try {
        const { archiveId, subArchiveId, imageId } = req.params;
        
        // 查找子档案
        const subArchive = await SubArchive.findOne({
            _id: subArchiveId,
            parentArchive: archiveId
        });
        
        if (!subArchive) {
            return res.status(404).json({ message: '子档案不存在' });
        }
        
        // 检查权限
        if (req.user.role !== 'admin' && subArchive.createdBy !== req.user.username) {
            return res.status(403).json({ message: '没有权限删除此图片' });
        }
        
        // 查找要删除的图片
        const image = subArchive.images.id(imageId);
        if (!image) {
            return res.status(404).json({ message: '图片不存在' });
        }
        
        // 删除图片文件
        const imagePath = path.join(__dirname, 'public', image.path);
        try {
            await fs.promises.unlink(imagePath);
        } catch (err) {
            console.error('删除图片文件失败:', err);
        }
        
        // 从子档案中移除图片记录
        subArchive.images.pull(imageId);
        await subArchive.save();
        
        res.json({ message: '图片已删除' });
    } catch (error) {
        console.error('删除图片失败:', error);
        res.status(500).json({ message: '删除图片失败：' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 