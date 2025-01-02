const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { upload } = require('../config/multer');
const Archive = require('../models/Archive');
const Tag = require('../models/Tag');
const { parseCustomData } = require('../utils/customDataParser');
const {
    getLatestArchive,
    getArchives,
    searchArchives,
    getArchiveStats,
    updateArchive,
    deleteArchive,
    createArchive,
    getArchive
} = require('../controllers/archiveController');

// 获取最新档案
router.get('/latest', verifyToken, getLatestArchive);

// 获取档案列表（分页）
router.get('/', verifyToken, getArchives);

// 搜索档案
router.get('/search', verifyToken, searchArchives);

// 获取档案统计信息
router.get('/stats', verifyToken, getArchiveStats);

// 修改档案
router.put('/:id', verifyToken, updateArchive);

// 删除档案（仅管理员）
router.delete('/:id', verifyToken, isAdmin, deleteArchive);

// 创建新档案
router.post('/', verifyToken, createArchive);

// 获取单个档案
router.get('/:id', verifyToken, getArchive);

module.exports = router; 