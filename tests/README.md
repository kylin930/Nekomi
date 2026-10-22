# MDUI 前端重构回归

依赖仅用于开发检查：Python 3、Python Playwright 和 Chromium。应用本身无需安装依赖或构建。脚本自动启动静态服务器，完成后关闭。

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium --artifacts /tmp/nekomi-browser
```

默认使用真实 CDN 链路并保留证书验证。若云代理 CA 被 curl 信任而 Chromium 信任库未配置，可显式使用：

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium --verified-cdn --artifacts /tmp/nekomi-browser
```

`--verified-cdn` 通过保留代理和 TLS 校验的 curl 获取原始 CDN 响应，再由 Playwright 回放。它不改变应用 URL、组件资源或浏览器信任库；这种运行验证页面行为，不代表 Chromium 原生 CDN 证书链已配置。

检查范围：

- 原生 Tabs / Tab Panel 显隐、选中状态、ARIA、点击、键盘、URL 深链接与前进后退。
- 两个原生主题 Menu 的同步、重复选择、键盘选择、关闭后的焦点、刷新记忆、系统主题及跨页面存储更新。
- 搜索的准确结果数、空结果、原生清空、可删除 Chip、文章标签筛选、快捷键及首个结果焦点。
- List Item、标题和按钮打开 Dialog；抽屉 → Dialog、Dialog → 搜索的焦点转换，关闭按钮、Escape 和遮罩。
- Drawer 原生滚动锁定、焦点约束、自动聚焦搜索、各关闭入口及桌面断点关闭。
- 原生导航吸顶、短屏侧栏滚动及底部主题菜单；桌面侧栏计算样式必须无背景、边框、圆角和阴影。
- 1440 / 1024 / 861 / 860 / 390 / 320px 的明暗模式，页面无水平溢出，色彩使用当前 MD3 语义令牌。
- 减少动效模式、坏图回退、友链 URL 过滤；正常页面无 JavaScript 错误和失败资源。
- 临时使用现有页面截图作为封面测试图片，检查宽卡片右图、窄卡片上图、裁切、底部操作流向、坏图恢复完整文字宽度及封面的键盘预览。

测试依赖于本仓库的固定演示数据（例如 `CSS` 恰好匹配 2 篇）。更换内容后，应相应更新预期结果。

参考：[MDUI 2 文档](https://www.mdui.org/zh-cn/docs/2/)与 [2.1.5 元数据](https://unpkg.com/mdui@2.1.5/custom-elements.json)。`a11y.js` 仅补齐该版本缺失能力；原生面板切换、组件视觉和模态焦点机制不由测试或适配重写。
