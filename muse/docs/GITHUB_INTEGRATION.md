# GitHub 集成功能说明

## 功能概述

Muse 插件现已支持 GitHub 集成功能,可以连接你的 GitHub 账户,查看和导入你的项目。

## 使用步骤

### 1. 获取 GitHub Personal Access Token

在使用 GitHub 功能之前,你需要创建一个 GitHub Personal Access Token:

1. 访问 [GitHub Token 设置页面](https://github.com/settings/tokens/new?scopes=repo)
2. 填写 Token 描述 (例如: "Muse Extension")
3. 选择权限范围:
   - ✅ `repo` - 访问私有和公共仓库
   - ✅ `read:user` - 读取用户信息
4. 点击 "Generate token" 生成 Token
5. **重要**: 复制生成的 Token (格式如: `ghp_xxxxxxxxxxxx`),它只会显示一次

### 2. 连接 GitHub 账户

1. 点击 Muse 插件弹窗中的 **GitHub** 按钮
2. 在弹出的对话框中粘贴你的 Personal Access Token
3. 点击 **连接** 按钮
4. 连接成功后,工具栏会显示你的 GitHub 头像和用户名

### 3. 浏览 GitHub 项目

连接成功后,再次点击 **GitHub** 按钮即可查看:

- 你的所有公开和私有仓库
- 按最近更新时间排序
- 显示项目描述、Star 数、Fork 数、主要编程语言等信息

### 4. 导入 GitHub 项目

1. 在 GitHub 项目列表中,找到想要导入的项目
2. 点击项目右侧的 **导入** 按钮
3. 确认导入对话框
4. 系统会自动:
   - 创建本地项目
   - 通过 GitHub API 递归获取文件树
   - 下载所有文本文件 (.md, .txt, .js, .json, .css, .html, .yml, .xml 等)
   - 每批次 5 个文件并发下载,并实时更新到存储
   - 最多导入 100 个文件(可在代码中调整)
5. 导入过程中可以在浏览器控制台查看进度
6. 导入完成后,你可以在编辑器中查看和编辑所有文件

### 5. 管理连接

- **刷新项目列表**: 点击项目列表对话框中的 🔄 按钮
- **断开连接**: 点击 🚪 按钮,将清除本地存储的 Token

## 功能特性

### ✅ 已实现

- GitHub Token 认证
- 显示用户头像和用户名
- 获取所有仓库列表 (公开+私有)
- 按更新时间排序
- 显示仓库详细信息
- **递归导入整个仓库的文件树**
- **批量下载多个文件(并发控制)**
- **支持多种文本文件格式**
- Token 安全存储 (仅保存在本地浏览器)
- 连接状态管理
- 下载进度控制台输出

### 🔜 未来计划

- 导入二进制文件 (图片、PDF 等)
- 可视化下载进度条
- 选择性导入指定目录/文件
- 同步本地修改到 GitHub
- 创建新的 Commit 并 Push
- 分支管理
- Pull Request 集成

## 安全说明

### Token 存储

- Token 仅存储在浏览器的 `chrome.storage.local` 中
- 不会发送到任何第三方服务器
- 仅用于调用 GitHub API

### 权限说明

插件需要以下权限:

- `storage` - 存储 Token 和用户信息
- `identity` - 用于身份验证流程
- `https://api.github.com/*` - 调用 GitHub API

### 最佳实践

1. 使用最小权限原则创建 Token
2. 定期轮换 Token
3. 如果 Token 泄露,立即在 GitHub 设置中撤销
4. 不要与他人分享你的 Token

## 常见问题

### Q: Token 无效或过期怎么办?

A: 在 GitHub 项目列表对话框中点击 🚪 断开连接,然后重新创建 Token 并连接。

### Q: 能看到哪些项目?

A: 可以看到你的所有公开和私有仓库,以及你有访问权限的组织仓库。

### Q: 导入的项目会修改 GitHub 上的内容吗?

A: 不会。当前版本只支持导入 (只读),不会修改 GitHub 上的任何内容。

### Q: 为什么只导入了部分文件?

A:
1. 当前版本只导入文本文件 (.md, .txt, .js, .json, .css, .html, .yml, .xml, LICENSE, README 等)
2. 为了避免存储占用过大,默认最多导入 100 个文件
3. 二进制文件(图片、视频等)暂不支持
4. 可以在浏览器控制台(F12)查看下载进度和跳过的文件

### Q: Token 会过期吗?

A: Personal Access Token 可以设置过期时间,也可以设置为永不过期。在创建 Token 时可以选择。

## 技术实现

- **认证方式**: GitHub Personal Access Token
- **API 版本**: GitHub REST API v3
- **请求频率**: 遵循 GitHub API 速率限制
- **数据编码**: Base64 解码 (支持 UTF-8)

## 更新日志

### v1.2.0 (2025-01-XX)

- ✨ 改进 GitHub 导入功能
- ✨ 支持递归获取整个仓库文件树
- ✨ 批量下载多个文件(5个并发)
- ✨ 支持多种文本文件格式
- ✨ 增加文件数量限制(默认100个)
- ✨ 实时保存和渲染下载进度
- 🐛 修复只能导入 README 的问题

### v1.1.0 (2025-01-XX)

- ✨ 新增 GitHub 集成功能
- ✨ 支持 Token 认证
- ✨ 支持查看仓库列表
- ✨ 支持导入 README 文件
- ✨ 新增用户头像显示
- 🎨 优化 UI 设计

---

如有问题或建议,欢迎提 Issue!
