#!/bin/bash

# 设置应用端口
PORT=3000

# 输出时间戳函数
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

echo "[$(timestamp)] 开始停止应用..."

# 查找运行在指定端口的进程
PID=$(netstat -tulpn 2>/dev/null | grep ":${PORT}" | awk '{print $7}' | cut -d'/' -f1 | head -n1)

if [ -z "$PID" ]; then
    echo "[$(timestamp)] 没有找到运行在端口 ${PORT} 的应用"
    exit 0
fi

# 显示进程信息
echo "[$(timestamp)] 找到进程 PID: ${PID}"
echo "[$(timestamp)] 进程详情:"
ps -f -p $PID

# 尝试正常终止进程
echo "[$(timestamp)] 正在停止进程..."
kill $PID 2>/dev/null || {
    echo "[$(timestamp)] 发送终止信号失败"
    exit 1
}

# 设置最大等待时间（秒）
MAX_WAIT=10
WAIT_COUNT=0

# 等待进程终止，带超时检查
while kill -0 $PID 2>/dev/null; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "[$(timestamp)] 等待超时，强制终止进程..."
        kill -9 $PID 2>/dev/null
        break
    fi
done

# 最后检查
if netstat -tulpn 2>/dev/null | grep -q ":${PORT}"; then
    echo "[$(timestamp)] 错误：无法停止应用"
    exit 1
else
    echo "[$(timestamp)] 应用已成功停止"
fi 