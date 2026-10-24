# 第三方依赖与许可说明

本项目的 UI 运行时依赖为 MDUI 2 与 Google Material Icons 字体；通用模板默认不请求外部壁纸或评论服务。项目自身代码、布局、样式与文档均为原创实现。

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
- @astrojs/sitemap 3.7.4 与 @astrojs/rss 4.0.19（MIT）：官方静态 Sitemap / RSS 构建集成，不进入客户端运行时。
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

- 原站个人预览入口：https://www.nekopara.uk/pic_api（通用模板默认关闭）
- 站长明确要求接入；图片由接口重定向至外部存储，不随主题源码打包。交付截图与录屏包含接口实际返回的图片。
- 素材权利归各自权利人，不属于主题 MIT 许可，也不表示主题获得了随机池内所有图片的再分发授权。可配置站长已审核的固定图片替换。


## P2.5 通用模板与第三方服务

默认配置不含个人域名、邮箱、头像 URL 或随机壁纸请求；外部统计脚本 / 评论服务默认关闭。原站完整配置位于 examples/personal，启用前由部署者自行确认图片服务使用权。入门文章均为项目原创示例，明确 demo:true，不进入正式索引。旧十篇示例与项目自身界面截图保留用于迁移 / 回归，不包含打包的第三方动漫原图。

可选 Umami 集成只按用户配置加载其部署提供的脚本；本仓库不复制或捆绑 Umami 源码，部署者需遵守对应服务和隐私要求。Material Icons 的 Google Fonts 请求仍然存在；没有默默新增分析请求。

配置校验使用 Astro 公开的 astro/zod 导出（Zod，MIT，https://github.com/colinhacks/zod）。Node 内置模块、Astro 官方 RSS / Sitemap 仅参与构建。生产输出没有 Python 测试、screenshots、examples 或配置源文件；图片说明已移至 docs/，不进入生产输出。

构建会运行 `npm run licenses`，在静态产物输出 THIRD-PARTY-LICENSES.txt，保留浏览器分发代码的许可与版权。完整直接依赖及构建工具特殊许可清单见 [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)，不将 Sharp / 图像编解码器的 LGPL 或 MPL 依赖误标为 MIT。


## 可选评论客户端（0.4.0）

仅在用户明确配置服务并进入评论区域 / 打开最新评论时，由浏览器载入远程客户端；未把这些 SDK 源码、框架或资源打入 npm 主题依赖。静态框架依然为 Astro + MDUI。远程库可以包含各自的 UI 运行时，遵守相应上游许可。自托管或修改这些资源时需保留上游完整许可与版权。

| 资源 | 默认版本 | 许可证 | 官方来源 |
| --- | --- | --- | --- |
| @waline/client | 3.16.1 | MIT | https://github.com/walinejs/waline |
| Twikoo | 2.0.17 | MIT | https://github.com/twikoojs/twikoo |
| Artalk 前端 | 2.10.0 | MIT | https://github.com/ArtalkJS/Artalk |
| Giscus 托管 client.js | 官方滚动更新，不虚构版本 | MIT，Copyright (c) 2021 Sage M. Abdullah | https://github.com/giscus/giscus |

前三者默认 jsDelivr 文件固定版本并配置 SRI，目录见 `src/integrations/comments/catalog.ts`；Giscus 使用官方托管服务。SDK 可能继续请求头像、验证码、登录或服务自身资源，不代表本仓库拥有这些资源的版权或将其作为默认素材分发。主题不提供服务端程序。隐私、跨域、嵌入与资源覆盖说明见 [动态评论服务](docs/COMMENTS.md)。

## P3 品牌图标

GitHub 与 Bilibili 图标为 **Simple Icons 15.1.0** 的原始独立 SVG，许可证 **CC0-1.0**，通过 Astro 静态内联，没有新增图标库或字体请求。文件、来源及许可见 [src/assets/icons](src/assets/icons/README.md)；完整 CC0 条款随静态产物的 THIRD-PARTY-LICENSES.txt 一同提供。普通网站、邮箱、RSS 继续使用既有 Material Icons。

CC0 不授予平台商标权。品牌图标仅用于用户实际配置的链接，不代表平台背书，也没有默认添加个人账号。
