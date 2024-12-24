# 档案管理系统 (Document Management System)

一个基于 Node.js 和 MongoDB 的档案管理系统，提供档案的录入、查询、修改和删除功能，支持自定义数据字段和权限管理。

## 功能特点

### 用户管理
- 用户认证和权限管理（管理员/普通用户）
- JWT 认证，支持7天免登录
- 记录操作IP地址
- 移动端自适应的导航栏和汉堡菜单

### 系统概览
- 总档案数统计
- 最新录入时间显示
- 点击查看详细信息
- 优雅的弹出式详情卡片

### 档案管理
- 档案录入（基础数据和自定义数据）
- 档案列表（时间倒序排序）
- 美观的编号展示（自动补零）
- 档案搜索（支持模糊搜索）
- 分页显示（响应式设计）
- 档案修改（管理员可修改所有，普通用户只能修改自己的）
- 档案删除（仅管理员）
- 档案详情查看（支持弹窗展示）

### 界面设计
- 响应式设计，完美支持移动端
- 现代化的 UI 设计
- 平滑的动画效果
- 优雅的交互体验
- 直观的数据展示
- 自适应的卡片布局
- 优化的移动端导航
- 支持暗色/亮色主题

## 技术栈

- 后端：Node.js + Express
- 数据库：MongoDB
- 认证：JWT (JSON Web Token)
- 前端：原生 JavaScript + HTML5 + CSS3
- UI：响应式设计 + CSS3 动画
- 图标：Font Awesome 5
- 字体：Inter

## 快速开始

### 系统要求

- Node.js (v12.0.0 或更高版本)
- MongoDB (v4.0.0 或更高版本)
- Git

### 安装步骤

1. 克隆项目：
```bash
git clone git@github.com:luyi8792/cswk_DMS.git
cd cswk_DMS
```

2. 安装依赖：
```bash
npm install
```

3. 配置数据库：
修改 `app.js` 中的 MongoDB 连接字符串：
```javascript
mongoose.connect('mongodb://your_username:your_password@your_host:your_port')
```

4. 配置 JWT：
修改 `middleware/auth.js` 中的密钥：
```javascript
const JWT_SECRET = 'your-secret-key';
```

5. 创建管理员账户：
```bash
node scripts/createAdmin.js
```

6. 创建普通用户账户：
```bash
# 参数说明：1=管理员，2=普通用户
node scripts/createUser.js 2 username password
```

7. 启动应用：
```bash
chmod +x start.sh
./start.sh
```

### 默认管理员账户
- 用户名：admin
- 密码：admin123

## 项目结构

```
cswk_DMS/
├── models/              # 数据模型
│   ├── Archive.js      # 档案模型
│   └── User.js         # 用户模型
├── middleware/          # 中间件
│   └── auth.js         # 认证中间件
├── public/             # 前端文件
│   ├── index.html      # 主页面
│   ├── style.css       # 样式文件
│   └── script.js       # 前端脚本
├── scripts/            # 脚本文件
│   ├── createAdmin.js  # 创建管理员脚本
│   └── createUser.js   # 创建用户脚本
├── app.js              # 应用主文件
├── start.sh           # 启动脚本
├── stop.sh            # 停止脚本
├── upload.sh          # 代码上传脚本
├── download.sh        # 代码下载脚本
└── README.md          # 项目说明文档
```

## 使用说明

### 系统概览
- 总档案数：显示系统中的档案总数
- 最新录入：显示最近录入的档案时间
- 点击卡片可查看详细信息
- 支持动画过渡效果

### 档案录入
基础数据：
- 来源（最多64字符）
- 要素（最多64字符）

自定义数据示例：
```
姓名: 张三
性别: 男
身份证号: 440123199001011234
户籍地址: 广东省广州市天河区
```

### 档案列表
- 按时间倒序排序
- 最早的档案编号为 01，往后递增
- 支持分页浏览
- 每条档案显示完整信息
- 包含查看、编辑和删除功能
- 支持展开/收起详细信息
- 优雅的动画过渡效果

### 档案搜索
- 支持模糊搜索
- 可搜索所有字段
- 实时显示搜索结果
- 分页展示搜索结果
- 高亮显示匹配内容

### 用户权限
管理员：
- 可以查看所有档案
- 可以修改所有档案
- 可以删除任何档案
- 可以录入新档案
- 可以查看录入信息

普通用户：
- 可以查看所有档案
- 只能修改自己创建的档案
- 不能删除档案
- 可以录入新档案
- 可以查看基本信息

### 移动端特性
- 响应式布局
- 汉堡菜单导航
- 触摸友好的界面
- 优化的表单输入
- 适配不同屏幕尺寸
- 流畅的动画效果

## API 接口

### 认证接口
```bash
# 用户登录
POST /auth/login

# 用户注册（需要管理员权限）
POST /auth/register
```

### 档案接口
```bash
# 获取档案统计信息
GET /archives/stats

# 获取最新档案
GET /archives/latest

# 新增档案
POST /archives

# 获取档案列表（分页）
GET /archives?page=1&limit=10

# 搜索档案
GET /archives/search?keyword=关键词&page=1&limit=10

# 修改档案
PUT /archives/:id

# 删除档案（需管理员权限）
DELETE /archives/:id
```

## 维护和更新

1. 更新应用
```bash
git pull
npm install
./stop.sh
./start.sh
```

2. 清理日志
```bash
rm app.log
```

3. 备份数据
```bash
mongodump -d your_database_name
```

## 注意事项

1. 安全性
   - 请修改 JWT_SECRET 密钥
   - 在生产环境中使用环境变量
   - 定期更改管理员密码
   - 使用 HTTPS 协议
   - 设置适当的 CORS 策略

2. 数据库
   - 确保 MongoDB 服务正常运行
   - 定期备份数据库
   - 设置访问权限控制
   - 优化索引配置

3. 日志
   - 应用日志保存在 app.log 文件中
   - 定期检查和清理日志文件
   - 配置日志轮转策略

4. 性能优化
   - 合理设置分页大小
   - 优化数据库查询
   - 使用适当的索引
   - 控制并发连接数

## 许可证

MIT License

## 作者

luyi8792

## 联系方式

- GitHub: https://github.com/luyi8792