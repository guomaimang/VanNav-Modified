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
