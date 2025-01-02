const Tag = require('../models/Tag');
const Archive = require('../models/Archive');

// 获取所有标签
const getTags = async (req, res) => {
    try {
        const tags = await Tag.find().sort({ usageCount: -1 });
        res.json(tags);
    } catch (error) {
        console.error('获取标签失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 添加新标签
const createTag = async (req, res) => {
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
};

// 删除标签
const deleteTag = async (req, res) => {
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
};

module.exports = {
    getTags,
    createTag,
    deleteTag
}; 