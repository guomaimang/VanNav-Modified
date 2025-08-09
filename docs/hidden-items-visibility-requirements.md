# Van Nav 隐藏项目显示规则需求文档

## 📋 需求概述

本文档定义了 Van Nav 导航系统中隐藏项目（工具和分类）的显示规则，确保不同用户状态和访问环境下的正确权限控制。

## 🎯 核心需求

### 显示规则优先级

隐藏项目的显示应遵循以下优先级规则：

1. **用户登录状态** > **IP信任状态**
2. 已登录用户始终具有查看隐藏项目的权限
3. 未登录用户的权限取决于其IP是否被信任

### 具体显示规则

| 用户状态 | IP状态 | 隐藏项目显示 | 说明 |
|---------|-------|-------------|------|
| **未登录** | 非信任IP | ❌ **不显示** | 普通访客无权查看隐藏内容 |
| **未登录** | 信任IP | ✅ **显示** | 信任IP环境下允许查看 |
| **已登录** | 非信任IP | ✅ **显示** | 登录用户拥有完整权限 |
| **已登录** | 信任IP | ✅ **显示** | 登录用户拥有完整权限 |

## 🔍 当前问题分析

### 现有实现缺陷

当前 `JWTCheck` 函数的逻辑存在问题：

```go
func JWTCheck(c *gin.Context) bool {
    // 首先检查IP白名单
    clientIP := c.ClientIP()
    if isIPInWhiteList(clientIP, db) {
        return true  // 问题：白名单IP优先于JWT检查
    }
    
    // 然后检查JWT token
    rawToken := c.Request.Header.Get("Authorization")
    // ... JWT验证逻辑
}
```

**问题所在：** 白名单IP检查优先于JWT检查，导致无法正确处理"已登录用户在非信任IP下应该看到隐藏项目"的场景。

### 影响范围

1. **网站前台** (`ui/website/`)：用户浏览导航页面时的隐藏项目显示
2. **API接口** (`/api/`)：获取工具和分类数据的权限控制  
3. **数据库查询**：`getAllTool()` 和 `getAllCatelog()` 函数的 `showHide` 参数

## ✅ 修复方案

### 1. 修改权限检查逻辑

将 `JWTCheck` 函数重构为同时检查两种权限状态：

```go
func JWTCheck(c *gin.Context) bool {
    // 先检查JWT token（登录状态）
    rawToken := c.Request.Header.Get("Authorization")
    if rawToken != "" {
        token, err := ParseJWT(rawToken)
        if err == nil {
            if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
                c.Set("username", claims["name"])
                c.Set("uid", claims["id"])
                return true  // 已登录用户始终可以查看隐藏项目
            }
        }
    }
    
    // 如果未登录，检查IP白名单
    clientIP := c.ClientIP()
    return isIPInWhiteList(clientIP, db)
}
```

### 2. 业务逻辑调整

确保 `GetAllHandler` 正确使用修复后的权限检查：

```go
func GetAllHandler(c *gin.Context) {
    showHide := JWTCheck(c)  // 使用修复后的权限检查
    tools := getAllTool(db, showHide)
    catelogs := getAllCatelog(db, showHide)
    setting := getSetting(db)
    // ... 返回数据
}
```

## 🔒 安全考虑

### 权限级别

1. **最高权限**：已登录管理员用户
   - 可以查看和管理所有隐藏项目
   - 可以设置IP白名单

2. **查看权限**：已登录普通用户 或 信任IP访客
   - 可以查看隐藏项目
   - 无法修改隐藏项目

3. **受限权限**：未登录非信任IP用户
   - 只能查看非隐藏项目

### 实现细节

- **JWT Token 验证**：确保token有效性和过期时间
- **IP白名单管理**：支持动态添加/删除信任IP
- **数据库隔离**：通过 `hide` 字段控制数据查询范围

## 📱 用户体验

### 前端展示

1. **登录用户**：显示完整的导航内容，包括所有隐藏项目
2. **信任IP访客**：显示完整内容，但可能有访客标识
3. **普通访客**：只显示公开内容，隐藏敏感或内部工具

### 管理后台

- 管理员可以在后台设置哪些工具和分类为隐藏状态
- 提供IP白名单管理功能
- 显示当前用户的权限状态

## 🧪 测试场景

### 测试用例

1. **场景1**：未登录用户从非信任IP访问
   - 预期：只看到非隐藏项目

2. **场景2**：未登录用户从信任IP访问  
   - 预期：看到所有项目（包括隐藏项目）

3. **场景3**：已登录用户从非信任IP访问
   - 预期：看到所有项目（包括隐藏项目）

4. **场景4**：已登录用户从信任IP访问
   - 预期：看到所有项目（包括隐藏项目）

### 验证方法

- 使用不同IP地址和登录状态访问 `/api/` 接口
- 检查返回的工具和分类数据中是否包含隐藏项目
- 验证前端页面的显示内容是否符合预期

## 📈 未来扩展

### 可选增强功能

1. **细粒度权限**：支持不同用户角色的权限区分
2. **访问日志**：记录隐藏项目的访问情况
3. **动态权限**：基于时间段或其他条件的权限控制
4. **IP段支持**：支持CIDR格式的IP段白名单

---

**文档版本：** 1.0  
**创建时间：** 2024年  
**最后更新：** 2024年
