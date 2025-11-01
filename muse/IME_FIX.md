# 中文/日文输入法修复说明

## 问题描述
在原版本中，无法使用输入法输入中文、日文等 CJK 字符。

## 修复内容

### 1. HTML 修改
为所有文本输入控件添加了 `lang="zh-CN"` 属性：
- `textarea#editor` - 主编辑器
- `input#filename` - 文件名输入框
- `input#commitMessage` - 提交信息输入框

### 2. CSS 修改

#### 编辑器 (#editor)
```css
#editor {
  /* 添加中日韩字体支持 */
  font-family: 'Monaco', 'Menlo', 'Consolas',
               'Microsoft YaHei', '微软雅黑',
               'PingFang SC', 'Hiragino Sans GB',
               'Source Han Sans CN', 'Noto Sans CJK SC',
               monospace;

  /* 启用输入法模式 */
  ime-mode: active;
  -webkit-ime-mode: active;
  -moz-ime-mode: active;
}
```

#### 输入框 (.filename-input, .commit-input)
```css
.filename-input, .commit-input {
  /* 添加系统字体和中文字体 */
  font-family: -apple-system, BlinkMacSystemFont,
               'Segoe UI', 'Microsoft YaHei',
               '微软雅黑', 'PingFang SC', sans-serif;

  /* 启用输入法模式 */
  ime-mode: active;
  -webkit-ime-mode: active;
  -moz-ime-mode: active;
}
```

## 支持的输入法
- ✅ 中文输入法（简体/繁体）
- ✅ 日文输入法（平假名/片假名/汉字）
- ✅ 韩文输入法
- ✅ 其他 IME 输入法

## 测试方法

1. 重新加载 Muse 扩展
2. 打开编辑器
3. 切换到中文/日文输入法
4. 在编辑器中输入文字
5. 验证可以正常显示中文/日文

## 字体支持

### Windows
- Microsoft YaHei（微软雅黑）
- SimHei（黑体）

### macOS
- PingFang SC（苹方-简）
- Hiragino Sans GB（冬青黑体）

### Linux
- Source Han Sans CN（思源黑体）
- Noto Sans CJK SC（Noto 中文）

## 注意事项

- `ime-mode` 属性在某些现代浏览器中已废弃，但为了兼容性仍然保留
- 字体回退机制确保在任何系统上都能正确显示中文字符
- `spellcheck="false"` 禁用拼写检查，避免中文下划线干扰
