#!/bin/bash

# 输出时间戳函数
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# 设置仓库地址
REPO_URL="git@github.com:luyi8792/cswk_DMS.git"
BRANCH="main"

echo "[$(timestamp)] 开始拉取代码..."

# 检查是否已经存在目标目录
if [ -d "cswk_DMS" ]; then
    echo "[$(timestamp)] 目标目录已存在，正在备份..."
    mv cswk_DMS cswk_DMS_backup_$(date '+%Y%m%d_%H%M%S')
fi

# 克隆仓库
echo "[$(timestamp)] 克隆仓库..."
git clone $REPO_URL || {
    echo "[$(timestamp)] 克隆仓库失败"
    exit 1
}

# 进入项目目录
cd cswk_DMS || {
    echo "[$(timestamp)] 进入项目目录失败"
    exit 1
}

# 切换到指定分支
echo "[$(timestamp)] 切换到 ${BRANCH} 分支..."
git checkout $BRANCH || {
    echo "[$(timestamp)] 切换分支失败"
    exit 1
}

# 安装依赖
echo "[$(timestamp)] 安装项目依赖..."
npm install || {
    echo "[$(timestamp)] 安装依赖失败"
    exit 1
}

# 添加脚本执行权限
echo "[$(timestamp)] 添加脚本执行权限..."
chmod +x start.sh stop.sh upload.sh download.sh

echo "[$(timestamp)] 代码��取完成！"
echo "[$(timestamp)] 项目目录：$(pwd)"
echo "[$(timestamp)] 可以使用以下命令启动应用："
echo "cd cswk_DMS"
echo "./start.sh" 