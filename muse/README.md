# Muse - Chrome 浏览器插件

Muse 是一个优雅的 Chrome 浏览器插件，集成 Markdown 编辑器和 Git 版本控制功能。

## 功能特性

### 📝 Markdown 编辑
- 实时 Markdown 编辑器
- 实时预览功能（分屏显示）
- 字符统计
- 语法高亮显示

### 📁 文件管理
- 创建、保存、打开和删除 Markdown 文件
- 文件列表管理
- 自动保存最后编辑的文件
- 基于 Chrome Storage API 的持久化存储

### 🔧 Git 版本控制
- **Git Init**: 初始化 Git 仓库
- **Git Commit**: 提交文件更改
- **Git Log**: 查看提交历史
- **Git Diff**: 查看文件差异对比

## 安装步骤

### 1. 准备图标文件

首先需要生成插件图标：

1. 在浏览器中打开 `create-icons.html`
2. 点击"下载图标"按钮
3. 将下载的 `icon16.png`、`icon48.png`、`icon128.png` 文件移动到 `icons/` 目录

或者使用以下命令（需要安装 ImageMagick）：

```bash
# 从 SVG 生成 PNG 图标
convert -background none icons/icon.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png
```

### 2. 加载插件到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `muse` 文件夹
6. 插件安装完成！

## 使用指南

### 🚀 重要：中文/日文输入支持

**如果您需要使用输入法输入中文、日文、韩文等**，请点击弹窗顶部的 **🚀 打开编辑器** 按钮，在新标签页中使用完整编辑器。

Chrome 扩展弹窗由于浏览器限制可能无法正常使用输入法，完整编辑器模式完全支持所有输入法。详见 [EDITOR_TAB.md](EDITOR_TAB.md)

### 两种使用模式

#### 1. 弹窗模式（快速编辑）
- 点击浏览器工具栏的 Muse 图标
- 在 800x600 弹窗中快速编辑
- ⚠️ 可能无法使用输入法

#### 2. 完整编辑器模式（推荐）✨
- 点击弹窗中的 **🚀 打开编辑器** 按钮
- 在新标签页中打开全屏编辑器
- ✅ 完全支持输入法
- ✅ 更大的编辑空间
- ✅ 所有功能完全相同

### 基本操作

1. **新建文件**: 点击 📄 新建按钮
2. **保存文件**: 输入文件名（自动添加 .md 后缀），点击 💾 保存
3. **打开文件**: 点击 📂 打开，从文件列表中选择文件
4. **预览模式**: 点击 👁️ 预览，启用分屏实时预览
5. **打开完整编辑器**: 点击 🚀 打开编辑器（在新标签页中打开）

### Git 操作流程

#### 1. 初始化仓库
首次使用时，点击 🔧 Init 按钮初始化 Git 仓库。

#### 2. 提交更改
1. 编辑并保存 Markdown 文件
2. 在"提交信息"输入框中输入提交说明
3. 点击 ✅ Commit 按钮提交

#### 3. 查看历史
点击 📜 Log 按钮查看所有提交历史，包括：
- 提交 ID
- 提交日期
- 提交信息
- 文件数量

#### 4. 对比差异
1. 打开要对比的文件
2. 点击 🔍 Diff 按钮
3. 查看当前版本与上次提交的差异

## 项目结构

```
muse/
├── manifest.json          # Chrome 插件配置文件
├── popup.html            # 主界面 HTML
├── popup.js              # 主界面逻辑
├── styles.css            # 样式表
├── background.js         # 后台服务
├── create-icons.html     # 图标生成工具
├── icons/                # 图标目录
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── libs/                 # 第三方库
│   └── marked.min.js     # Markdown 解析库
└── README.md             # 项目文档
```

## 技术栈

- **Manifest V3**: Chrome 插件最新规范
- **Marked.js**: Markdown 解析和渲染
- **Chrome Storage API**: 数据持久化
- **原生 JavaScript**: 无依赖框架

## 功能说明

### 文件存储
所有文件存储在 Chrome 浏览器的本地存储中（chrome.storage.local），包括：
- 文件内容
- 文件元数据
- Git 提交历史

### Git 模拟
此插件实现了简化版的 Git 功能：
- 使用 JSON 格式存储提交历史
- 每次提交保存完整的文件快照
- 支持简单的文本差异对比

**注意**: 这是一个模拟的 Git 系统，仅用于在浏览器环境中管理文件版本，不涉及真实的 Git 仓库操作。

## 快捷键

目前插件主要通过点击操作，后续版本可以添加快捷键支持。

## 浏览器兼容性

- ✅ Chrome 88+
- ✅ Edge 88+
- ⚠️ 其他基于 Chromium 的浏览器（需测试）

## 数据安全

- 所有数据仅存储在本地浏览器中
- 不涉及网络传输
- 建议定期导出重要文件作为备份

## 未来计划

- [ ] 添加导出/导入功能
- [ ] 支持快捷键操作
- [ ] 添加主题切换（浅色/深色）
- [ ] 支持更多 Markdown 语法
- [ ] 添加文件搜索功能
- [ ] 支持标签分类管理
- [ ] Git 分支管理功能

## 常见问题

### Q: 如何备份我的文件？
A: 目前可以通过复制粘贴的方式备份文本内容。未来版本将添加导出功能。

### Q: 文件存储大小有限制吗？
A: Chrome Storage API 的限制约为 10MB。对于纯文本 Markdown 文件来说通常足够。

### Q: 可以与真实的 Git 仓库同步吗？
A: 当前版本不支持。这是一个独立的版本控制系统，运行在浏览器环境中。

### Q: 支持图片插入吗？
A: 支持 Markdown 图片语法，但需要使用外部图片链接（如 imgur、GitHub 等）。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 作者

开发于 2025 年
