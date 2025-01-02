const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { upload } = require('../config/multer');
const {
    createSubArchive,
    getSubArchives,
    getSubArchive,
    updateSubArchive,
    deleteSubArchive,
    deleteSubArchiveImage
} = require('../controllers/subArchiveController');

// 创建子档案
router.post('/:archiveId/subArchives', verifyToken, upload.array('images', 10), createSubArchive);

// 获取子档案列表
router.get('/:archiveId/subArchives', verifyToken, getSubArchives);

// 获取单个子档案
router.get('/:archiveId/subArchives/:subArchiveId', verifyToken, getSubArchive);

// 更新子档案
router.put('/:archiveId/subArchives/:subArchiveId', verifyToken, upload.array('images', 10), updateSubArchive);

// 删除子档案
router.delete('/:archiveId/subArchives/:subArchiveId', verifyToken, deleteSubArchive);

// 删除子档案图片
router.delete('/:archiveId/subArchives/:subArchiveId/images/:imageId', verifyToken, deleteSubArchiveImage);

module.exports = router; 