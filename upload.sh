#!/bin/bash

# 输出时间戳函数
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# 设置仓库地址
REPO_URL="git@github.com:luyi8792/cswk_DMS.git"
BRANCH="main"

echo "[$(timestamp)] 开始上传代码..."

# 检查是否已经初始化git仓库
if [ ! -d ".git" ]; then
    echo "[$(timestamp)] 初始化Git仓库..."
    git init
    
    # 添加远程仓库
    echo "[$(timestamp)] 添加远程仓库..."
    git remote add origin $REPO_URL
fi

# 确保工作区干净
echo "[$(timestamp)] 检查工作区状态..."
if [ -n "$(git status --porcelain)" ]; then
    # 添加所有文件
    echo "[$(timestamp)] 添加文件到暂存区..."
    git add .
    
    # 提交更改
    echo "[$(timestamp)] 提交更改..."
    git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# 拉取最新代码
echo "[$(timestamp)] 拉取远程仓库最新代码..."
git pull origin $BRANCH || {
    echo "[$(timestamp)] 拉取代码失败，可能是首次推送"
}

# 推送代码
echo "[$(timestamp)] 推送代码到远程仓库..."
git push -u origin $BRANCH || {
    echo "[$(timestamp)] 推送���败，尝试强制推送..."
    git push -u origin $BRANCH --force
}

# 检查结果
if [ $? -eq 0 ]; then
    echo "[$(timestamp)] 代码上传成功！"
else
    echo "[$(timestamp)] 代码上传失败，请检查错误信息"
    exit 1
fi

# 显示当前状态
echo "[$(timestamp)] 当前Git状态："
git status 