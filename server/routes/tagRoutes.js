const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { getTags, createTag, deleteTag } = require('../controllers/tagController');

// 获取所有标签
router.get('/', verifyToken, getTags);

// 添加新标签（管理员功能）
router.post('/', verifyToken, createTag);

// 删除标签（管理员功能）
router.delete('/:id', verifyToken, isAdmin, deleteTag);

module.exports = router; 