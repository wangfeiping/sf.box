# Muse 版本信息

## 当前版本：v1.0.0

发布日期：2025-11-01

## 主要功能

### ✨ 核心特性
- ✅ Markdown 实时编辑器
- ✅ 实时预览（分屏显示）
- ✅ 文件管理（新建、保存、打开、删除）
- ✅ Git 版本控制（Init, Commit, Log, Diff）
- ✅ 完整编辑器标签页模式
- ✅ 中文/日文/韩文输入法支持

### 🎨 界面设计
- 现代化 UI 设计
- 紫色渐变强调按钮
- 响应式布局
- 友好的用户体验

### 💾 数据存储
- 基于 Chrome Storage API
- 无限存储空间支持
- 自动保存最后编辑文件
- Git 历史完整记录

## 两种使用模式

### 1. 弹窗模式
- 800x600 像素窗口
- 快速访问
- 基础编辑功能

### 2. 完整编辑器模式（推荐）
- 全屏标签页
- 完全支持输入法
- 更好的编辑体验
- 所有功能完全相同

## 文件清单

### 核心文件
- `manifest.json` - Chrome 扩展配置
- `popup.html` - 弹窗界面
- `editor.html` - 完整编辑器页面
- `popup.js` - 核心逻辑（300+ 行）
- `styles.css` - 样式表（200+ 行）
- `background.js` - 后台服务

### 资源文件
- `icons/` - 插件图标（16x16, 48x48, 128x128）
- `libs/marked.min.js` - Markdown 解析库

### 文档文件
- `README.md` - 完整项目文档
- `QUICKSTART.md` - 快速开始指南
- `EDITOR_TAB.md` - 完整编辑器使用说明
- `INSTALL.md` - 安装指南
- `DEMO.md` - Markdown 示例
- `IME_FIX.md` - 输入法修复说明
- `VERSION.md` - 版本信息（本文件）

### 工具文件
- `generate-icons.py` - Python 图标生成脚本
- `create-icons.html` - 浏览器图标生成工具

## 技术栈

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (ES6+)
- **Marked.js** - Markdown 解析
- **Chrome Storage API** - 数据持久化
- **Chrome Tabs API** - 标签页管理

## 权限需求

- `storage` - 保存文件和 Git 历史
- `unlimitedStorage` - 支持大量文件
- `tabs` - 打开完整编辑器标签页

## 浏览器兼容性

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ 其他 Chromium 浏览器

## 已知限制

1. 弹窗模式可能无法使用输入法（已通过完整编辑器解决）
2. 当前版本 Git 只能查看历史，不能恢复版本
3. 暂不支持文件导出功能
4. 暂不支持图片上传

## 更新日志

### v1.0.0 (2025-11-01)
- 🎉 首次发布
- ✨ Markdown 编辑器
- ✨ Git 版本控制
- ✨ 完整编辑器标签页
- ✨ 输入法支持
- 📝 完整文档

## 未来规划

### v1.1.0（计划中）
- [ ] 文件导出功能（导出为 .md 文件）
- [ ] 文件导入功能
- [ ] Git 版本恢复功能
- [ ] 快捷键支持

### v1.2.0（计划中）
- [ ] 主题切换（浅色/深色）
- [ ] 自定义字体大小
- [ ] 编辑器配置
- [ ] 文件搜索功能

### v2.0.0（远期规划）
- [ ] 云同步功能
- [ ] 多设备同步
- [ ] 图片上传支持
- [ ] 标签分类管理
- [ ] Git 分支管理

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 作者

Muse Team
开发于 2025 年

---

**享受使用 Muse 的乐趣！**

记得点击 🚀 打开编辑器按钮，体验完整的编辑功能！
