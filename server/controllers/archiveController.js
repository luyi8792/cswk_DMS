const Archive = require('../models/Archive');
const Tag = require('../models/Tag');
const { parseCustomData } = require('../utils/customDataParser');

// 获取最新档案
const getLatestArchive = async (req, res) => {
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
};

// 获取档案列表（分页）
const getArchives = async (req, res) => {
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
};

// 搜索档案
const searchArchives = async (req, res) => {
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
                    query.$and = [
                        { $or: query.$or },
                        { tags: { $all: tags } }
                    ];
                    delete query.$or;
                } else {
                    query.tags = { $all: tags };
                }
            }
        }

        const total = await Archive.countDocuments(query);
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
};

// 获取档案统计信息
const getArchiveStats = async (req, res) => {
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
};

// 修改档案
const updateArchive = async (req, res) => {
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
};

// 删除档案
const deleteArchive = async (req, res) => {
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
};

// 创建新档案
const createArchive = async (req, res) => {
    try {
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
            const tagsData = req.body.tags;
            tags = typeof tagsData === 'string' ? JSON.parse(tagsData) : tagsData;
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
            for (const tagName of tags) {
                let tag = await Tag.findOne({ name: tagName });
                if (!tag) {
                    tag = new Tag({
                        name: tagName,
                        usageCount: 0,
                        createdBy: req.user.username
                    });
                    await tag.save();
                }
                await Tag.updateOne(
                    { _id: tag._id },
                    { $inc: { usageCount: 1 } }
                );
                validTags.push(tagName);
            }
        }
        
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
        res.status(201).json(savedArchive);
    } catch (error) {
        console.error('创建档案失败:', error);
        res.status(400).json({ message: error.message });
    }
};

// 获取单个档案
const getArchive = async (req, res) => {
    try {
        const archive = await Archive.findById(req.params.id);
        if (!archive) {
            return res.status(404).json({ message: '档案不存在' });
        }
        res.json(archive);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLatestArchive,
    getArchives,
    searchArchives,
    getArchiveStats,
    updateArchive,
    deleteArchive,
    createArchive,
    getArchive
}; 