#!/bin/bash
# 开发环境启动脚本

echo "正在启动 SPC 分析应用（开发模式）..."

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "未找到 node_modules，正在安装依赖..."
    npm install
fi

# 启动开发服务器
npm run dev
