# 第三方依赖与许可说明

本项目的运行时依赖只有 MDUI 2 与 Google Material Icons 字体。项目自身代码、布局、样式与文档均为原创实现。

## 运行时依赖

### MDUI 2.1.5

- 用途：Material Design 3 Web Components（Tabs、Text Field、Dropdown、Menu、Dialog、Navigation Drawer 等）与 MD3 Design Tokens。
- 引入方式：unpkg CDN，固定版本，不使用 `latest`。
  - `https://unpkg.com/mdui@2.1.5/mdui.css`
  - `https://unpkg.com/mdui@2.1.5/mdui.global.js`
- 许可证：MIT
- 版权：Copyright (c) zdhxiong / MDUI contributors
- 项目主页：https://github.com/zdhxiong/mdui
- 文档：https://www.mdui.org/zh-cn/docs/2/

### Google Material Icons

- 用途：界面图标字体（菜单、搜索、主题、关闭、空状态等）。
- 引入方式：Google Fonts CSS，运行时从 `fonts.googleapis.com` / `fonts.gstatic.com` 加载，不在本仓库再分发字体文件。
  - `https://fonts.googleapis.com/css2?family=Material+Icons&family=Material+Icons+Outlined&display=swap`
- 许可证：Apache License 2.0
- 版权：Copyright Google LLC
- 项目主页：https://fonts.google.com/icons

Material Icons 仅用于单个 UI 图标，没有拼贴成插画、背景或站点角色。

## 设计参考（未复用代码或素材）

### Stellar

- 参考范围：左侧整体式侧栏、内容区顶部切换栏、两栏比例、吸顶行为、内容层级。
- 项目：https://github.com/xaoxuu/hexo-theme-stellar
- 演示：https://xaoxuu.com/wiki/stellar/
- 许可证：MIT
- 复用情况：没有复制源码、CSS、模板、图片或字体资源。布局参数和交互模式为本项目重新实现。

### G

- 参考范围：自然的文章卡片排版、标题 / 摘要 / 日期 / 标签的节奏、圆角卡片与阅读密度。
- 项目：https://github.com/youranreus/G
- 许可证：GPL-3.0
- 复用情况：没有复制 G 的任何 PHP、CSS、JavaScript、图片或素材；本项目为纯静态 HTML/CSS/JS，不包含 GPL 代码。

## 开发与截图工具（非运行时依赖）

- Playwright 1.61.1（Apache-2.0）与 Chromium（BSD-style licenses）用于本地打开页面、检查视口与生成截图。
- 这些工具不属于站点运行时，未随项目源码分发。

## 本项目许可

本项目以 MIT License 发布，见 [LICENSE](LICENSE)。

如果站长后续添加头像、文章封面或友链头像，请确保对应图片与站点信息拥有合法使用授权。
