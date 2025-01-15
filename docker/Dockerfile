FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json文件
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装依赖
WORKDIR /app/server
RUN npm install
WORKDIR /app/client
RUN npm install

# 复制源代码
WORKDIR /app
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server/app.js"] 