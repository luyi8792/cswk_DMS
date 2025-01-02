const Archive = require('../models/Archive');
const SubArchive = require('../models/SubArchive');
const fs = require('fs').promises;
const path = require('path');

// 创建子档案
const createSubArchive = async (req, res) => {
    try {
        const { archiveId } = req.params;
        const { content } = req.body;
        
        // 检查主档案是否存在
        const archive = await Archive.findById(archiveId);
        if (!archive) {
            return res.status(404).json({ message: '主档案不存在' });
        }
        
        // 检查权限：只有管理员或创建者可以添加子档案
        if (req.user.role !== 'admin' && archive.createdBy !== req.user.username) {
            return res.status(403).json({ message: '没有权限添加子档案' });
        }
        
        // 处理上传的图片
        const images = req.files.map(file => ({
            filename: file.originalname,
            path: path.relative(path.join(__dirname, '../../public'), file.path),
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
};

// 获取子档案列表
const getSubArchives = async (req, res) => {
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
};

// 获取单个子档案
const getSubArchive = async (req, res) => {
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
};

// 更新子档案
const updateSubArchive = async (req, res) => {
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
                path: path.relative(path.join(__dirname, '../../public'), file.path),
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
};

// 删除子档案
const deleteSubArchive = async (req, res) => {
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
            const imagePath = path.join(__dirname, '../../public', image.path);
            try {
                await fs.unlink(imagePath);
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
};

// 删除子档案图片
const deleteSubArchiveImage = async (req, res) => {
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
        const imagePath = path.join(__dirname, '../../public', image.path);
        try {
            await fs.unlink(imagePath);
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
};

module.exports = {
    createSubArchive,
    getSubArchives,
    getSubArchive,
    updateSubArchive,
    deleteSubArchive,
    deleteSubArchiveImage
}; 