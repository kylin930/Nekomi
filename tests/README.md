# MDUI 2.1.5 浏览器回归

应用仍是零构建静态页面。以下依赖仅用于测试：Python 3、Python Playwright、Chromium。脚本自动启动本地静态服务，测试完成后关闭，不需要提前运行服务器。

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium
```

可用 `--artifacts /tmp/nekomi-browser` 保存 6 个宽度的明暗截图。默认检查真实 CDN 请求，不忽略证书错误。

若云代理的 CA 已被 curl 信任，但 Chromium 信任库未配置，可显式使用：

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium --verified-cdn --artifacts /tmp/nekomi-browser
```

该选项让 curl 保持代理及 TLS 校验，取得 CDN 原始响应，再通过 Playwright 路由回放。它不修改应用 URL、组件资源或浏览器信任库；这种运行证明页面交互可用，不证明 Chromium 原生 CDN 链路可用。

脚本会检查：

- Tabs 点击、方向键 / Home / End、ARIA、标签筛选、深链接及前进后退。
- 主题重复选择、两个 Menu 状态、刷新记忆、系统明暗与跨页面存储更新。
- Menu 原生键盘导航、Dropdown Escape / 外部点击关闭与焦点恢复。
- 搜索、空结果、内置清空、快捷键、Enter 进入结果与预览。
- Drawer 焦点约束、全部关闭入口、断点关闭、搜索及 Drawer → Dialog 转换。
- Dialog 焦点约束、关闭按钮 / Escape / 遮罩及焦点恢复。
- 1440 / 1024 / 901 / 900 / 390 / 320px 的明暗布局，以及正常资源加载和 JavaScript 错误。

审计参考：[Tabs](https://www.mdui.org/zh-cn/docs/2/components/tabs)、[Navigation Drawer](https://www.mdui.org/zh-cn/docs/2/components/navigation-drawer)、[Dropdown](https://www.mdui.org/zh-cn/docs/2/components/dropdown)、[Menu](https://www.mdui.org/zh-cn/docs/2/components/menu)、[Text Field](https://www.mdui.org/zh-cn/docs/2/components/text-field)、[Dialog](https://www.mdui.org/zh-cn/docs/2/components/dialog)、[setTheme](https://www.mdui.org/zh-cn/docs/2/functions/setTheme)、[Design Tokens](https://www.mdui.org/zh-cn/docs/2/styles/design-tokens)。

版本差异以 [2.1.5 的组件元数据与源码](https://unpkg.com/mdui@2.1.5/custom-elements.json)为准。保留 Tabs 的键盘与 ARIA 补充、外置面板同步，以及 Menu / Dropdown 焦点竞争的针对性修复。
