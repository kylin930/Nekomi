# 第三方依赖与许可说明

本项目的 UI 运行时依赖为 MDUI 2 与 Google Material Icons 字体；默认背景来自站长提供的图片 API。项目自身代码、布局、样式与文档均为原创实现。

## 运行时依赖

### MDUI 2.1.5

- 用途：Material Design 3 Web Components（Tabs / Tab Panel、Avatar、Card、List / List Item、Chip、Button、Text Field、Top App Bar、Collapse、Dialog、Snackbar、Navigation Drawer 等）与 MD3 Design Tokens。
- 引入方式：npm 固定 `mdui@2.1.5`，Vite 按需构建组件 / 函数与官方 CSS，不再使用 CDN 总包。
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

- 参考范围：融入页面的透明侧栏、内容区顶部切换栏、两栏布局、吸顶行为、文章辅助目录与内容层级。
- 项目：https://github.com/xaoxuu/hexo-theme-stellar
- 实际页面：https://xaoxuu.com/
- 文档：https://xaoxuu.com/wiki/stellar/
- 许可证：MIT
- 复用情况：没有复制源码、CSS、模板、图片或字体资源。布局参数和交互模式为本项目重新实现。

### G

- 参考范围：自然的文章卡片排版、标题 / 摘要 / 日期 / 标签的节奏、圆角卡片、正文阅读节奏与排版密度，以及清新个人博客的视觉气质。
- 项目：https://github.com/youranreus/G
- 许可证：GPL-3.0
- 复用情况：没有复制 G 的任何 PHP、CSS、JavaScript、图片或素材；本项目由 Astro 输出纯静态 HTML/CSS/JS，不包含 GPL 代码。

## 构建依赖

- Astro 7.4.2（MIT）：静态页面、Content Collections、客户端导航和 View Transitions；构建后不需要 Astro 服务。主页：https://astro.build/ 。
- Shiki（MIT，与 Astro 一同安装）仅用于构建期语法高亮；GitHub Light / Dark 主题随 Shiki 提供，不加载客户端高亮脚本。
- @astrojs/markdown-remark 7.3.4（MIT）与 rehype-raw 7.0.0（MIT）：构建期 Markdown 与可信 HTML 处理。
- @astrojs/check 与 @types/node 为 MIT 许可，TypeScript 为 Apache-2.0 许可；均只用于开发检查。具体版本与传递依赖固定在 package-lock.json，许可文件随 npm 包提供。

## 开发与截图工具（非运行时依赖）

- Playwright 1.62.0（Apache-2.0）与 Chromium（BSD-style licenses）用于本地打开页面、检查视口与生成截图。
- 这些工具不属于站点运行时，未随项目源码分发。

## 本项目许可

本项目以 MIT License 发布，见 [LICENSE](LICENSE)。

如果站长后续添加头像、文章封面或友链头像，请确保对应图片与站点信息拥有合法使用授权。

### 站长背景图片 API

- 默认入口：https://www.nekopara.uk/pic_api
- 站长明确要求接入；图片由接口重定向至外部存储，不随主题源码打包。交付截图与录屏包含接口实际返回的图片。
- 素材权利归各自权利人，不属于主题 MIT 许可，也不表示主题获得了随机池内所有图片的再分发授权。可配置站长已审核的固定图片替换。
