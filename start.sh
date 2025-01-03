#!/bin/bash

# 设置应用端口
PORT=3000

# 输出时间戳函数
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

echo "[$(timestamp)] 开始启动应用..."

# 检查是否有应用正在运行
PID=$(netstat -tulpn 2>/dev/null | grep ":${PORT}" | awk '{print $7}' | cut -d'/' -f1 | head -n1)
if [ ! -z "$PID" ]; then
    echo "[$(timestamp)] 发现端口 ${PORT} 被占用，PID: ${PID}"
    echo "[$(timestamp)] 正在停止旧进程..."
    kill -9 $PID
    sleep 2
    
    # 再次检查端口是否已释放
    if netstat -tulpn 2>/dev/null | grep -q ":${PORT}"; then
        echo "[$(timestamp)] 错误：无法释放端口 ${PORT}"
        exit 1
    fi
    echo "[$(timestamp)] 旧进程已停止"
fi

# 检查数据库连接
echo "[$(timestamp)] 检查数据库连接..."
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://root:zhsbkczj@mongodb-mongodb.ns-5a3vu6yx.svc:27017').then(() => {
    console.log('[$(timestamp)] 数据库连接正常');
    process.exit(0);
}).catch(error => {
    console.error('[$(timestamp)] 数据库连接失败:', error);
    process.exit(1);
});" || exit 1

# 启动应用
echo "[$(timestamp)] 正在启动应用..."
node server/app.js > app.log 2>&1 &
APP_PID=$!

# 等待应用启动
sleep 2

# 检查应用是否成功启动
if netstat -tulpn 2>/dev/null | grep -q ":${PORT}"; then
    echo "[$(timestamp)] 应用启动成功，运行在端口 ${PORT}"
    echo "[$(timestamp)] 可以访问 http://localhost:${PORT}"
    echo "[$(timestamp)] 日志文件：app.log"
    echo "[$(timestamp)] 进程 PID: ${APP_PID}"
else
    echo "[$(timestamp)] 应用启动失败，请检查 app.log"
    cat app.log
    exit 1
fi 