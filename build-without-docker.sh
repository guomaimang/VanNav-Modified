#!/bin/bash
# build-local.sh

echo "🚀 开始本地构建 Van Nav..."

# 构建网站前台
echo "📦 构建网站前台..."
cd ui/website && yarn install && yarn build && cd ../..

# 构建管理后台
echo "📦 构建管理后台..."
cd ui/admin && yarn install && yarn build && cd ../..

# 准备静态文件
echo "📁 准备静态文件..."
mkdir -p server/public/admin
cp -r ui/website/build/* server/public/
cp -r ui/admin/dist/* server/public/admin/

# 修正资源路径（根据操作系统调整）
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/\/assets/\/admin\/assets/g' server/public/admin/index.html
else
    # Linux
    sed -i 's/\/assets/\/admin\/assets/g' server/public/admin/index.html
fi

# 构建后端
echo "🔧 构建后端服务..."
cd server && go mod tidy && go build -o nav . && cd ..

echo "✅ 构建完成！"
echo "🌐 运行: cd server && ./nav"
echo "🌐 访问: http://localhost:6412"