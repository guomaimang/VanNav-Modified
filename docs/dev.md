# Van Nav 项目开发文档

## 项目结构分析

### 🏗️ 整体架构

Van Nav 是一个**导航站**项目，采用前后端分离架构，分为前端和后端两个主要部分：

**前端部分包含两个独立应用：**

#### 1. 网站前台 (`ui/website/`)
- **技术栈**: React 17 + TypeScript
- **开发端口**: 2333 
- **框架**: Create React App (CRA)
- **功能**: 用户访问的主要导航页面
- **构建后**: 静态文件部署到 `public/` 目录

#### 2. 管理后台 (`ui/admin/`)
- **技术栈**: React 18 + TypeScript + Vite + Ant Design
- **开发端口**: 6411
- **框架**: Vite
- **功能**: 管理员管理导航内容的后台界面
- **构建后**: 静态文件部署到 `public/admin/` 目录

**后端部分：**

#### 后端服务 (`server/`)
- **技术栈**: Go + Gin 框架
- **数据库**: SQLite (`nav.db`)
- **运行端口**: **6412** (默认，可通过 `-port` 参数指定)
- **功能**: 
  - 提供 API 接口
  - 静态文件服务
  - JWT 认证
  - 数据库操作

### 📊 运行端口总结

| 组件 | 开发端口 | 生产端口 | 说明 |
|------|---------|---------|------|
| 后端服务 | 6412 | 6412 | Go 服务，可通过 `-port` 参数修改 |
| 网站前台 | 2333 | - | 开发时使用，生产时打包为静态文件 |
| 管理后台 | 6411 | - | 开发时使用，生产时打包为静态文件 |

### 🔑 认证信息
- 默认管理员账号：`admin`
- 默认管理员密码：`admin`

---

## 开发环境 API 映射机制

### 🌐 网站前台 API 映射

**配置方式：** 使用 Create React App (CRA) 的代理功能

#### 代理配置 (`ui/website/package.json`)
```json
{
  "proxy": "http://localhost:6412",
  "scripts": {
    "start": "PORT=2333 react-scripts start"
  }
}
```

#### API 请求配置 (`ui/website/src/utils/api.tsx`)
```javascript
const baseUrl = "/api/";  // 相对路径
```

**工作原理：**
```
前端 (localhost:2333) → API请求 (/api/xxx) → CRA代理 → 后端 (localhost:6412/api/xxx)
```

**示例：**
- 前端请求: `http://localhost:2333/api/`
- 实际转发: `http://localhost:6412/api/`

### 🛠️ 管理后台 API 映射

**配置方式：** 使用 Vite 的代理功能

#### 代理配置 (`ui/admin/vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6412',
        changeOrigin: true
      },
    },
    port: 6411,
    base: '/admin/'
  }
})
```

#### API 请求配置 (`ui/admin/src/utils/api.ts`)
```typescript
// 使用相对路径，依赖代理配置
await axios.get("/api/admin/all");
await axios.post("/api/login", { name: username, password });
```

**工作原理：**
```
管理后台 (localhost:6411) → API请求 (/api/xxx) → Vite代理 → 后端 (localhost:6412/api/xxx)
```

### 🔀 两种代理方式对比

| 特性 | 网站前台 (CRA) | 管理后台 (Vite) |
|------|---------------|----------------|
| **配置方式** | `package.json` 中的 `proxy` 字段 | `vite.config.ts` 中的 `server.proxy` |
| **配置复杂度** | 简单，只能配置单个目标 | 灵活，支持多种代理规则 |
| **匹配规则** | 自动代理所有API请求 | 可自定义路径匹配规则 |
| **高级选项** | 有限 | 丰富（rewrite、secure、ws等） |

---

## Docker 构建后的转发机制

### 🏗️ 多阶段 Docker 构建

```dockerfile
# 第一阶段：前端构建
FROM node:18-alpine AS feBuilder
WORKDIR /app
COPY . .
RUN cd ui/admin && yarn install && yarn build && cd ../..     # 构建管理后台
RUN cd ui/website && yarn install && yarn build && cd ../..  # 构建网站前台
RUN mkdir -p public/admin
RUN cp -r ui/website/build/* public/                         # 网站前台 → public/
RUN cp -r ui/admin/dist/* public/admin/                      # 管理后台 → public/admin/
RUN sed -i 's/\/assets/\/admin\/assets/g' public/admin/index.html  # 修正路径

# 第二阶段：后端构建
FROM golang:alpine AS binarybuilder
COPY ./server .
COPY --from=feBuilder /app/public /app/public               # 静态文件嵌入
RUN go mod tidy && go build .

# 第三阶段：运行时镜像
FROM alpine:latest
COPY --from=binarybuilder /app/nav /app/                    # 单一可执行文件
EXPOSE 6412
ENTRYPOINT [ "/app/nav" ]
```

### 🎯 生产环境架构：单一 Go 服务

构建完成后，**不再有独立的前端服务器**，所有内容都由 **Go 服务** 在端口 **6412** 处理：

```
用户请求 → Go 服务 (6412) → 静态文件服务 + API 服务
```

### 📁 静态文件嵌入

Go 服务使用 `embed` 指令将前端文件嵌入到二进制文件中：

```go
//go:embed public
var fs embed.FS

// 目录结构：
// public/
// ├── index.html           (网站前台主页)
// ├── static/              (网站前台资源)
// └── admin/
//     ├── index.html       (管理后台主页)
//     └── assets/          (管理后台资源)
```

### 🔀 智能路由分发

Go 服务通过自定义的路由处理逻辑来分发请求：

```go
func Serve(urlPrefix string, fs ServeFileSystem) gin.HandlerFunc {
    return func(c *gin.Context) {
        path := c.Request.URL.Path
        pathHasAdmin := strings.Contains(path, "/admin")
        pathHasAPI := strings.Contains(path, "/api")
        
        if fs.Exists(urlPrefix, c.Request.URL.Path) {
            // 文件存在，直接服务静态文件
            fileserver.ServeHTTP(c.Writer, c.Request)
        } else {
            if pathHasAdmin && !pathHasAPI {
                // /admin/* 路径但文件不存在 → 返回 admin/index.html (SPA 路由)
                adminFile, _ := fs.Open("/admin/index.html")
                http.ServeContent(c.Writer, c.Request, "index.html", time.Now(), adminFile)
            }
            // 其他情况交给后续路由处理
        }
    }
}
```

### 📋 请求处理流程

| 请求路径 | 处理方式 | 说明 |
|----------|----------|------|
| `/` | 返回 `public/index.html` | 网站前台主页 |
| `/static/*` | 返回 `public/static/*` | 网站前台静态资源 |
| `/admin` | 返回 `public/admin/index.html` | 管理后台主页 |
| `/admin/assets/*` | 返回 `public/admin/assets/*` | 管理后台静态资源 |
| `/admin/*` (SPA路由) | 返回 `public/admin/index.html` | React Router 路由 |
| `/api/*` | Go API 处理器 | 后端 API |

### 🔧 关键特性

#### 1. SPA 路由支持
- 对于 `/admin/*` 路径，如果对应文件不存在，自动返回 `admin/index.html`
- 支持 React Router 的客户端路由

#### 2. 资源路径修正
```bash
# 构建时自动修正管理后台的资源路径
sed -i 's/\/assets/\/admin\/assets/g' public/admin/index.html
```

#### 3. 统一服务
- 前端静态文件：嵌入式文件系统
- 后端 API：Gin 路由处理
- 单一端口：6412

### 📊 开发环境 vs 生产环境对比

| 环境 | 网站前台 | 管理后台 | 后端 | 代理 |
|------|----------|----------|------|------|
| **开发** | CRA (2333) | Vite (6411) | Go (6412) | 各自的开发服务器代理 |
| **生产** | - | - | Go (6412) | Go 内置路由处理 |

### 🚀 生产环境优势

1. **单一部署单元**: 只需部署一个 Go 二进制文件
2. **无需反向代理**: 不需要 Nginx 等额外组件
3. **高性能**: Go 内置的静态文件服务性能优异
4. **简化运维**: 减少了组件间的网络通信

---

## 部署结构

### 📁 最终部署结构

在生产环境中：
- Go 后端服务运行在端口 **6412**
- 前端静态文件被嵌入到 Go 二进制文件中
- 用户访问 `http://localhost:6412` 可以看到网站前台
- 管理员访问 `http://localhost:6412/admin` 可以进入管理后台

这种架构实现了从开发环境的多服务到生产环境的单一服务的无缝转换，既保证了开发效率，又简化了部署复杂度。

## 开发调试方法

根据 README.md，本地调试方法如下：

### 前端前台
```bash
cd ui/website
yarn i
yarn start
```

### 前端后台
```bash
cd ui/admin
yarn i
yarn dev
```

### 后端
```bash
cd server
go mod tidy
go run .
```

## Docker 构建方法

```shell
docker buildx build -t hanjiaming/vannav:0.0.x-dev --platform linux/amd64 .
```

## Docker 运行

```bash
docker run -d --name vannav --restart always -p 6412:6412 -v /opt/vannav-hjm:/app/data hanjiaming/vannav:x.x.x-dev
```

打开浏览器 `http://localhost:6412` 即可访问。

## 本地构建方法（不使用Docker）

如果您想在本地环境中构建整个项目而不使用Docker，可以按照以下步骤进行：

### 📋 前置要求

确保您的系统已安装以下工具：
- **Node.js** (版本 16+ 推荐)
- **Yarn** 包管理器
- **Go** (版本 1.19+ 推荐)

### 🏗️ 构建步骤

#### 1. 构建前端应用

**第一步：构建网站前台**
```bash
cd ui/website
yarn install
yarn build
cd ../..
```

**第二步：构建管理后台**
```bash
cd ui/admin
yarn install
yarn build
cd ../..
```

#### 2. 准备静态文件目录

```bash
# 创建 public 目录结构
mkdir -p server/public/admin

# 复制网站前台构建文件到 public 目录
cp -r ui/website/build/* server/public/

# 复制管理后台构建文件到 public/admin 目录
cp -r ui/admin/dist/* server/public/admin/

# 修正管理后台的资源路径引用
sed -i 's/\/assets/\/admin\/assets/g' server/public/admin/index.html
```

> **注意**: 在 macOS 系统中，sed 命令可能需要使用 `-i ''` 参数：
> ```bash
> sed -i '' 's/\/assets/\/admin\/assets/g' server/public/admin/index.html
> ```

#### 3. 构建后端服务

```bash
cd server
go mod tidy
go build -o nav .
```

### 🚀 运行构建后的应用

构建完成后，您可以直接运行生成的可执行文件：

```bash
cd server
./nav
```

默认情况下，服务将在端口 **6412** 上启动。您可以通过以下方式自定义端口：

```bash
./nav -port 8080
```

### 🌐 访问应用

构建并启动后，您可以通过以下地址访问：

- **网站前台**: `http://localhost:6412`
- **管理后台**: `http://localhost:6412/admin`
- **API 接口**: `http://localhost:6412/api/`

### 📁 构建后的目录结构

完成构建后，`server/` 目录下的结构如下：

```
server/
├── nav                    # 可执行文件
├── nav.db                 # SQLite 数据库（首次运行时创建）
├── public/                # 嵌入的静态文件
│   ├── index.html         # 网站前台主页
│   ├── static/            # 网站前台资源文件
│   └── admin/
│       ├── index.html     # 管理后台主页
│       └── assets/        # 管理后台资源文件
├── main.go
├── handlers.go
└── ... (其他 Go 源文件)
```

### 🛠️ 便捷构建脚本

您也可以创建一个构建脚本来自动化这个过程：

```bash
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
```

使用方法：
```bash
chmod +x build-local.sh
./build-local.sh
```

### 🔧 注意事项

1. **静态文件嵌入**: 与Docker构建不同，本地构建需要手动将前端文件复制到 `server/public/` 目录，Go程序会通过 `embed` 指令将这些文件嵌入到二进制文件中。

2. **数据库文件**: 首次运行时，程序会在 `server/` 目录下创建 `nav.db` SQLite数据库文件。

3. **权限问题**: 在某些系统中，可能需要给构建后的可执行文件添加执行权限：
   ```bash
   chmod +x server/nav
   ```

4. **路径依赖**: 运行可执行文件时，请确保在 `server/` 目录下执行，以保证相对路径的正确性。
