#!/bin/bash
# 生产环境构建脚本

echo "正在构建 SPC 分析应用..."

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "未找到 node_modules，正在安装依赖..."
    npm install
fi

# 执行构建
npm run build

echo "构建完成！输出目录：dist/"
