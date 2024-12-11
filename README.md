# 档案管理系统 (Document Management System)

一个基于 Node.js 和 MongoDB 的档案管理系统，提供档案的录入、查询、修改和删除功能，支持自定义数据字段和权限管理。

## 功能特点

- 用户认证和权限管理（管理员/普通用户）
- 档案录入（基础数据和自定义数据）
- 档案查询（支持模糊搜索）
- 档案列表（分页显示）
- 档案修改（管理员可修改所有，普通用户只能修改自己的）
- 档案删除（仅管理员）
- 响应式设计，支持移动端访问
- 支持7天免登录
- 记录操作IP地址

## 技术栈

- 后端：Node.js + Express
- 数据库：MongoDB
- 认证：JWT (JSON Web Token)
- 前端：原生 JavaScript + HTML5 + CSS3

## 快速开始

### 系统要求

- Node.js (v12.0.0 或更高版本)
- MongoDB
- Git

### 安装步骤

1. 克隆项目：
```bash
# 在终端中运行
git clone git@github.com:luyi8792/cswk_DMS.git
cd cswk_DMS
```

2. 安装依赖：
```bash
# 在项目根目录下运行
npm install
```

3. 创建管理员账户：
```bash
# 在项目根目录下运行
node scripts/createAdmin.js
```

4. 创建普通用户账户：
```bash
# 在项目根目录下运行
# 参数说明：1=管理员，2=普通用户
node scripts/createUser.js 2 username password
```

5. 启动应用：
```bash
# 在项目根目录下运行
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
└── prompt.txt         # 系统设计文档
```

## 使用说明

### 档案录入格式
基础数据：
- 来源
- 要素

自定义数据示例：
```
# 在文本框中输入以下格式的数据
姓名: 张三
性别: 男
身份证号: 440123199001011234
户籍地址: 广东省广州市天河区
```

### 用户权限
管理员：
- 可以查看所有档案
- 可以修改所有档案
- 可以删除任何档案

普通用户：
- 可以查看所有档案
- 只能修改自己创建的档案
- 不能删除档案
- 可以录入新档案

## API 接口

### 认证接口
```bash
# 用户登录
POST /auth/login

# 用户注册
POST /auth/register
```

### 档案接口
```bash
# 获取档案统计信息
GET /archives/stats

# 新增档案
POST /archives

# 获取档案列表（分页）
GET /archives

# 搜索档案
GET /archives/search

# 修改档案
PUT /archives/:id

# 删除档案（需管理员权限）
DELETE /archives/:id
```

## 管理脚本

### 启动应用
```bash
# 在项目根目录下运行
./start.sh
```

### 停止应用
```bash
# 在项目根目录下运行
./stop.sh
```

### 创建新用户
```bash
# 在项目根目录下运行
node scripts/createUser.js <用户类型> <用户名> <密码>
# 用户类型：1=管理员，2=普通用户
```

## 注意事项

1. 安全性
   - 请修改 JWT_SECRET 密钥
   - 在生产环境中使用环境变量
   - 定期更改管理员密码

2. 数据库
   - 确保 MongoDB 服务正常运行
   - 定期备份数据库

3. 日志
   - 应用日志保存在 app.log 文件中
   - 定期检查和清理日志文件

## 故障排除

1. 端口占用
```bash
# 在项目根目录下依次运行
./stop.sh
./start.sh
```

2. 数据库连接失败
   - 检查 MongoDB 服务状态
   - 验证连接字符串

3. 登录问题
   - 确认账户已创建
   - 检查用户名和密码是否正确

## 维护和更新

1. 更新应用
```bash
# 在项目根目录下依次运行
git pull
npm install
./stop.sh
./start.sh
```

2. 清理日志
```bash
# 在项目根目录下运行
rm app.log
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 作者

luyi8792

## 联系方式

- GitHub: https://github.com/luyi8792