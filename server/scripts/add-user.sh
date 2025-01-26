#!/bin/bash

# 检查参数数量
if [ "$#" -ne 3 ]; then
    echo "用法: $0 <用户名> <密码> <用户类型(admin/user)>"
    exit 1
fi

USERNAME=$1
PASSWORD=$2
ROLE=$3

# 验证用户类型
if [ "$ROLE" != "admin" ] && [ "$ROLE" != "user" ]; then
    echo "错误: 用户类型必须是 'admin' 或 'user'"
    exit 1
fi

# 调用Node.js脚本
node "$(dirname "$0")/createUser.js" "$USERNAME" "$PASSWORD" "$ROLE" 