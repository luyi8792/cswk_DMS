#!/bin/bash
#建议的提交说明格式：
#feat: 新功能
#fix: 修复bug
#docs: 文档更新
#style: 代码格式调整
#refactor: 代码重构
#test: 添加测试
#chore: 其他修改

# 输出时间戳函数
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# 设置仓库地址
REPO_URL="git@github.com:luyi8792/cswk_DMS.git"
BRANCH="main"

# 获取提交说明
if [ $# -eq 0 ]; then
    # 如果没有提供参数，使用默认的提交说明
    COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
else
    # 使用提供的参数作为提交说明
    COMMIT_MSG="$1"
fi

echo "[$(timestamp)] 开始上传代码..."
echo "[$(timestamp)] 提交说明: ${COMMIT_MSG}"

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
    git commit -m "${COMMIT_MSG}"
fi

# 创建并切换到main分支
echo "[$(timestamp)] 切换到main分支..."
git checkout -b main 2>/dev/null || git checkout main

# 尝试拉取远程代码（如果存在）
echo "[$(timestamp)] 尝试拉取远程仓库最新代码..."
git pull origin main --allow-unrelated-histories || {
    echo "[$(timestamp)] 拉取代码失败，继续推送..."
}

# 推送代码
echo "[$(timestamp)] 推送代码到远程仓库..."
git push -u origin main || {
    echo "[$(timestamp)] 推送失败，尝试强制推送..."
    git push -u origin main --force
}

# 检查结果
if [ $? -eq 0 ]; then
    echo "[$(timestamp)] 代码上传成功！"
    echo "[$(timestamp)] 提交说明: ${COMMIT_MSG}"
else
    echo "[$(timestamp)] 代码上传失败，请检查错误信息"
    exit 1
fi

# 显示当前状态
echo "[$(timestamp)] 当前Git状态："
git status 