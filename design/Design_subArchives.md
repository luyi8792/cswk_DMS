# 子档案功能设计文档

## 一、功能概述

在现有档案管理系统的基础上，增加子档案功能。每个主档案可以包含多个子档案，子档案支持文本内容录入和图片上传功能。

## 二、系统设计

### 1. 数据模型设计

```javascript
// 主档案模型
Archive {
  source: String,        // 来源
  element: String,       // 要素
  rawCustomData: String, // 自定义数据
  tags: [String],        // 标签
  subArchives: [{       // 子档案数组
    type: ObjectId,
    ref: 'SubArchive'
  }],
  createdBy: String,    // 创建者
  createdAt: Date,      // 创建时间
  clientIP: String      // 客户端IP
}

// 子档案模型
SubArchive {
  parentArchive: {      // 关联主档案
    type: ObjectId,
    ref: 'Archive'
  },
  content: String,      // 子档案详情内容
  images: [{            // 图片信息
    filename: String,   // 原始文件名
    path: String,       // 相对路径
    size: Number,       // 文件大小
    mimetype: String,   // 文件类型
    uploadedAt: Date    // 上传时间
  }],
  createdAt: Date,      // 创建时间
  createdBy: String     // 创建者
}
```

### 2. 文件存储结构

```
project/
  ├── public/              
  │   ├── uploads/         # 上传文件根目录
  │   │   ├── archives/    # 档案图片目录
  │   │   │   ├── {archiveId}/     # 主档案目录
  │   │   │   │   ├── {subArchiveId}/  # 子档案目录
  │   │   │   │   │   ├── 1.jpg
  │   │   │   │   │   ├── 2.png
  │   │   │   │   │   └── ...
```

### 3. API设计

#### 创建子档案
- 路径: POST /archives/:archiveId/subArchives
- 请求体: 
  ```javascript
  {
    content: String,    // 子档案内容
    images: [File]      // 图片文件数组
  }
  ```
- 响应:
  ```javascript
  {
    _id: String,        // 子档案ID
    content: String,    // 内容
    images: [{          // 图片信息
      filename: String,
      path: String,
      size: Number,
      mimetype: String,
      uploadedAt: Date
    }],
    createdAt: Date,
    createdBy: String
  }
  ```

#### 获取子档案列表
- 路径: GET /archives/:archiveId/subArchives
- 查询参数: page, limit
- 响应:
  ```javascript
  {
    subArchives: [SubArchive],
    total: Number,
    page: Number,
    limit: Number
  }
  ```

#### 更新子档案
- 路径: PUT /archives/:archiveId/subArchives/:subArchiveId
- 请求体:
  ```javascript
  {
    content: String,    // 更新的内容
    images: [File]      // 新增的图片
  }
  ```

#### 删除子档案
- 路径: DELETE /archives/:archiveId/subArchives/:subArchiveId

#### 删除子档案图片
- 路径: DELETE /archives/:archiveId/subArchives/:subArchiveId/images/:imageId

## 三、实现步骤

### 第一阶段：基础架构搭建

1. 数据库模型创建
   - 创建SubArchive模型
   - 更新Archive模型，添加subArchives字段
   - 创建相关索引

2. 文件系统准备
   - 创建uploads目录结构
   - 配置静态文件服务
   - 配置multer中间件

3. API路由搭建
   - 创建子档案相关路由文件
   - 实现基础的CRUD接口
   - 添加权限验证中间件

### 第二阶段：前端界面开发

1. 主档案录入页面更新
   - 添加子档案录入区域
   - 实现动态添加子档案功能
   - 实现图片上传和预览
   - 更新提交表单逻辑

2. 档案详情页面更新
   - 添加子档案列表展示
   - 实现图片预览功能
   - 添加编辑和删除功能

3. 交互优化
   - 添加加载状态提示
   - 实现图片上传进度条
   - 添加操作确认提示
   - 实现图片预览放大功能

### 第三阶段：功能完善

1. 文件处理优���
   - 实现图片压缩
   - 生成缩略图
   - 添加文件类型验证
   - 实现文件大小限制

2. 性能优化
   - 实现子档案分页加载
   - 添加图片延迟加载
   - 优化数据库查询
   - 添加缓存机制

3. 安全性增强
   - 完善权限控制
   - 添加文件访问验证
   - 实现敏感数据过滤
   - 添加操作日志

### 第四阶段：测试和部署

1. 单元测试
   - 模型测试
   - API接口测试
   - 文件处理测试

2. 集成测试
   - 功能流程测试
   - 性能测试
   - 并发测试

3. 部署准备
   - 环境配置检查
   - 数据库迁移脚本
   - 部署文档编写

## 四、注意事项

1. 安全限制
   - 单个图片大小限制：2MB
   - 每个子档案图片数量限制：10张
   - 支持的图片格式：jpg、png、gif
   - 总存储空间监控

2. 性能考虑
   - 使用流式上传
   - 实现分片上传
   - 添加文件缓存
   - 定期清理未使用文件

3. 容错处理
   - 上传失败重试机制
   - 文件同步检查
   - 数据一致性验证
   - 错误日志记录

## 五、后续优化

1. 功能扩展
   - 批量上传优化
   - 图片编辑功能
   - 图片排序功能
   - 导出功能

2. 用户体验
   - 拖拽上传
   - 图片裁剪
   - 预览优化
   - 移动端适��

3. 运维支持
   - 监控告警
   - 备份策略
   - 容量规划
   - 性能优化 