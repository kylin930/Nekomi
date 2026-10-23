# Nekomi · 小林的小窝

基于 **Astro 静态构建、MDUI 2.1.5 / Material Design 3** 的原创博客主题。保留 Stellar 式融入侧栏、P1.1 配色与阅读排版；不使用 React / Vue。所有文章、日期与叙事均为演示内容。

P2.2 将固定版本 MDUI 迁至 npm / Vite 按需构建，接入 Astro 图片优化、选择性 Prefetch 和 Shiki，并以原生 List 呈现文章目录。保留 P2.1 的排版、响应式断点和表面层次。公共结构仍是 Astro 组件，十篇文章由 Content Collections / Markdown 输出，首页与文章通过 `<ClientRouter />` 无刷新切换。生产只需托管 `dist/`，无需运行 Node.js。

| 页面 | 桌面浅色 / 深色 | 手机浅色 / 深色 |
| --- | --- | --- |
| 首页 | [浅色](screenshots/p22-home-light-1440x900.png) · [深色](screenshots/p22-home-dark-1440x900.png) | [浅色](screenshots/p22-home-light-390x844.png) · [深色](screenshots/p22-home-dark-390x844.png) |
| 阅读 | [浅色](screenshots/p22-reader-light-1440x900.png) · [深色](screenshots/p22-reader-dark-1440x900.png) | [浅色](screenshots/p22-reader-light-390x844.png) · [深色](screenshots/p22-reader-dark-390x844.png) |

[P2.2 手机顶部、原生目录与语法高亮截图](screenshots/P22.md) · [P2.1 八个视口与排版样例](screenshots/P21.md) · [P2 手机无刷新导航录屏](screenshots/p2-navigation-390x844.webm)。截图和录屏使用站长 API 实际返回并经检查的图片，不是生成素材；自动化回归使用本项目截图作为确定性图片 fixture。

## 开发、构建与部署

推荐 Node.js **24 LTS**（`.nvmrc`），npm。依赖版本由 `package-lock.json` 固定。

```sh
npm ci
npm run dev
# http://localhost:4321

npm run check
npm run build
npm run preview
```

`npm run preview` 仅用于本地预览。发布 `dist/` 内的静态文件即可，生产不需要安装 npm 依赖、运行 Astro 服务或 SPA fallback。服务器应将目录请求映射到 `index.html`，不存在的路径返回 `404.html` 并保留 HTTP 404 状态。

根域部署默认使用 `/`。部署到 GitHub Pages 的 `/Nekomi/` 等子目录时：

```sh
SITE_BASE=/Nekomi/ npm run build
```

这会统一处理文章、脚本、CSS、图片、搜索和壁纸 Worker 的站内路径。`astro.config.mjs` 中的 `site` 可按最终域名修改。需要 HTTP(S)，不支持直接以 `file://` 打开构建产物。

云环境若默认缓存目录不可写，可运行 `npm --cache /tmp/nekomi-npm-cache ci`；若 Astro 遥测配置目录不可写，使用 `ASTRO_TELEMETRY_DISABLED=1 npm run build` / `npm run check`。不需要改动 HOME 或证书设置。

MDUI 固定 `mdui@2.1.5` npm 依赖，由 Vite 输出本地带 hash 的资源，不再请求 unpkg 或依赖 `window.mdui`。`src/scripts/mdui.js` 逐项注册实际使用的 20 种组件；组件内部的依赖由 Vite 去重。官方公共 CSS 仍完整导入（主题 / Tokens / 工具样式需要），`setTheme` / `setColorScheme` 从功能模块导入，不导入 MDUI 总入口。图标字体仍由 Google Fonts 提供。

文章标题、封面、阅读全文和相邻文章明确设置 `data-astro-prefetch="hover"`；`prefetchAll: false` 避免预取整页链接。普通锚点使用 Astro 原生处理，MDUI Shadow DOM 内的按钮 / Card 使用 Astro `prefetch()` 公共 API，延迟 80ms、URL 归一化并去重，遵循网络节流 / 离线限制。没有额外页面缓存系统。JS / CSS 含原远端 MDUI 总包的原始体积约 441.9 → 302.3 KiB，逐文件 gzip 估算 104.7 → 77.3 KiB（−26.14%），详见[完整体积口径](tests/ASSET-SIZES.md)。

## 组件、路由与生命周期

`SiteLayout.astro` 统一输出侧栏、原生 Top App Bar、Navigation Drawer、Dialog、Snackbar、主题控制和壁纸。公共 HTML 在构建时生成，不再由客户端字符串拼装。首页列表、分类、标签、归档、文章正文、目录和相邻导航也直接输出到静态 HTML。

- 首页：`/`，筛选链接仍为 `/?q=CSS#recent`；顶部 Tabs 状态与 Hash 同步。
- 文章：`/posts/css-grid-two-column-blog/`、`/posts/weekend-walk-by-river/`，可直接访问、刷新与分享。
- 章节：`/posts/css-grid-two-column-blog/#grid-minimum`，保留 P1 的显式标题 ID。
- 旧 `article.html?post=<id>#<heading>` 入口保留轻量兼容跳转；原 `#preview/<id>` 同样兼容。新内部链接全部使用静态文章 URL。
- 无效路径使用静态 `404.html`；不再运行时请求正文片段。

`ClientRouter` 管理页面请求、历史、滚动恢复和 View Transitions。只有正文执行 360ms 非线性滑入，后退方向反转；根画面和壁纸不做交叉淡入。`prefers-reduced-motion` 下缩至 1ms，目录立即定位。

**壁纸持久化与缓存是两层独立机制。** 壁纸、公共侧栏和导航都声明了命名 `transition:persist`。此外使用 Astro 官方 `astro:before-swap` / `event.swap` / `swapFunctions`：保留公共外壳在原来的 DOM 位置，只替换 `<main>` 和阅读目录，使用官方 helper 更新 head、根属性、脚本状态和焦点。壁纸容器及已解码的 `<img>` 不被移除、移动或替换，不重新请求随机 API，不再次解码或播放首次淡入。导航发生在图片尚未加载完时，也沿用同一个加载任务。

这个替换边界同时适配固定的 MDUI 2.1.5：Astro 默认 body swap 会在同一任务中两次移动持久化元素，触发该版本 ResizeObserver 清理异常。保留外壳原位避免了重复 disconnect；没有修改 MDUI 内部代码、屏蔽异常或升级 MDUI 版本。新增公共区域应放进布局 / 公共组件；新增页面沿用相同布局与 `main-content` 边界。

`runtime.js` 是只执行一次的模块：共享监听与主题单例只初始化一次。`astro:page-load` 为当前正文建立 AbortController，离开时清理监听、RAF、弹簧滚动和复制反馈计时器。导航前等待原生 Drawer / Dialog 关闭，焦点约束和滚动锁交由 MDUI 管理。MDUI 深层 Shadow DOM 中的图标链接也桥接到 Astro 导航，保留修饰键和新窗口行为。必要的固定版本无障碍补充在 `a11y.js`，不重做组件面板或模态机制。

## 内容与配置

站点配置集中在 [`site.config.json`](site.config.json)：个人名称、简介、圆形头像、配色、壁纸、友链与最近评论。构建时有 schema 校验，配置修改后需要重新构建。可用 `NEKOMI_CONFIG=/absolute/site.json` 指定完整配置，用于预览 / 测试，不改变默认数据。

文章放在 [`src/content/posts/`](src/content/posts/)，Content Collection schema 位于 [`src/content.config.ts`](src/content.config.ts)。文件名就是稳定文章 ID：

```md
---
title: 文章标题
excerpt: 用于首页与搜索的摘要
date: "2026-10-23"
category: 前端
tags: [CSS, Astro]
cover: ""
coverAlt: ""
demo: false
---

正文从这里开始，不重复页面标题。

## 稳定章节 {#stable-section}

支持普通 Markdown、代码围栏、图片、列表和表格。
```

[详细文章约定](src/content/README.md) · [图片接入](public/images/README.md)。保留全部十篇演示文章的元数据、正文、代码、图片与标题锚点；首页索引、侧栏更新、搜索与相邻文章均由同一 Collection 推导，不再维护第二份文章索引。

代码块由 Astro Shiki 在构建时生成 GitHub Light / Dark 双主题语法颜色，再补齐一层语言栏、原生复制 Button 和横向滚动区域（没有客户端高亮包），表格同样独立横向滚动。目录自动生成扁平的原生 `mdui-list` / `mdui-list-item`，以 H2–H6 深度缩进，原生 `href` / `rounded` / `active` 管理链接和选中状态，1440px 起有足够空间时放右侧，否则使用原生 Collapse。折叠目录点击后等待原生关闭动画，再执行原有弹簧定位；`aria-current` 同步到实际链接。正文保持原有 760px 上限与中文阅读节奏；复制、当前章节、标题永久链接、弹簧滚动、焦点与历史由轻量原生 JS 增强。

首页搜索范围为标题、摘要、分类和标签，输入过滤已有静态卡片，不重建 Web Components。文章页搜索按 Enter 无刷新返回首页。友链预览最多五项，“查看全部”使用原生 Dialog；侧栏三个 Tabs 在首页、文章和移动 Drawer 中共用。

最近评论配置示例：

```json
{
  "anchorsEnabled": false,
  "items": [{
    "id": "demo-1", "author": "演示访客", "avatar": "",
    "excerpt": "这是一条 UI 测试留言。",
    "postId": "css-grid-two-column-blog",
    "createdAt": "2026-10-23T08:30:00+08:00",
    "anchor": "", "demo": true
  }]
}
```

写入配置的 `comments` 字段。默认为空，演示评论明确标注；未知文章被过滤。没有评论后端时只进入对应文章，只有真实评论节点已实现后才可启用 `anchorsEnabled`。时间在构建时按 Asia/Shanghai 输出，避免部署机器时区影响。

## 排版与响应式参数

- 正文保留桌面 17px、手机 16px，统一行高 **1.85**；段落及图片 / 表格 / 代码等块间距 **1.25em**。H2 上间距 **1.85em**，H3 为 1.55em，H4 为 1.4em，H5–H6 为 1.25em；代码行高 1.8。
- 阅读页用 Grid 统一主段落区域间距：桌面 24px、手机 16px；紧凑导航下阅读容器与 App Bar 间新增 16px（App Bar 已计入安全区域），首页不变。标题元数据内部 16px / 8px。无头图、无标签、无目录时不留下空行；末段余白和文章末尾导航收紧，保留完整标题与标签。360px 及以下主标题 26px，其他手机为 28px。
- **1120px 起**保留 320px 融入式侧栏；更窄时使用单列、原生 App Bar 和 Drawer。断点由 320 侧栏 + 32 栏距 + 56 外边距 + 至少 712px 阅读表面推导，CSS 与键盘 / Drawer 的 JS 判断同步。
- **1440px 起**显示右侧 184px 目录，完整保留 760px 阅读表面（正文 696px）；1280 / 1359 / 1360px 使用折叠目录。正文左侧沿内容网格对齐，目录出现时不压缩或横移正文。1120px 时最小正文仍有 648px。
- 首页只微调原有 Card：标题 21px、最新篇 22px（手机均 20px），标题上下 8px、底部操作间距 8px；无图文字最长 48rem。有图仍按卡片实际宽度切换，上图 / 右图的阈值为 640px，右图最多 208px并与文字顶端对齐，最新篇底色权重降到 18%。

参数集中在 `src/styles/tokens.css`，布局和排版在 `main.css` / `home.css` / `article.css`。媒体查询中的 1120 / 1440px 与宽度预算对应；自定义侧栏或正文宽度时应同步重新核对预算，不只修改单个断点。

## 配色、壁纸与动效

主题按钮循环“浅色 → 深色 → 跟随系统”，使用 MDUI `setColorScheme()` / `setTheme()`；偏好本地保存，无存储权限时仍在客户端导航中保留。主色与樱粉 / 清蓝语义色、320px 透明侧栏、圆形无边框头像均沿用 P1.1。

`site.config.json` 中的 `appearance.wallpaper`：

| 字段 | 默认值 / 用途 |
| --- | --- |
| `enabled` | `true` |
| `light` | `https://www.nekopara.uk/pic_api` |
| `dark` | 空，沿用浅色同一图片 |
| `position` / `fit` | `center` / `cover`，可用 CSS object-position 与 `contain` |
| `lightOverlay` / `darkOverlay` | `.60` / `.68`，遮罩范围 0–1 |
| `lightSurface` / `darkSurface` | `.84` / `.88`，首页卡片及集合表面，范围 .65–1 |
| `lightReaderSurface` / `darkReaderSurface` | `.97` / `.97`，文章阅读表面，范围 .85–1 |
| `cacheHours` | `24`，1–168；0 禁用辅助缓存 |

600px 及以下在配置遮罩上额外叠加浅色 .10 / 深色 .08（上限 1），卡片表面不低于 .92、阅读区不低于 .985。侧栏仅使用连续渐隐并保持透明；壁纸存在时，其小字采用适合当前层次的 MD3 语义前景色。以上只改变 CSS 合成，不替换图像、重新解码或修改 Worker。

图片加载失败回退 MD3 默认背景；低优先级异步解码后首次淡入 650ms，不阻塞正文。明暗模式沿用同一图时只改变遮罩和表面。侧栏保持融入式渐隐，不新增浮动玻璃卡片。

API 在 P1.1 已实际验证：`/pic_api` 301 → `/pic_api/` 302 → 对象存储 200 `image/png`，不是 JSON；随机响应没有稳定 Cache-Control / Expires，最终图有 ETag / Last-Modified。样本约 2.8–4.2MB。没有假设固定图片地址或未经确认的缩略图参数。

`public/wallpaper-cache.js` 继续作为刷新 / 重访的辅助：仅缓存 `__nekomi_wallpaper` 图片请求，no-cors opaque 响应默认保存 24 小时、最多两张，合并并发并清理坏图；需要 HTTPS / localhost。它不缓存页面、脚本或文章，不是离线站点。**即使禁用 Worker，内部导航也保持同一个图片元素与图像。** 随机池内容与首次下载体积由 API 控制；需要稳定素材时可配置站长审核、压缩后的固定图片。

目录滚动继续采用质量 1、刚度 220、阻尼 28 的小步弹簧积分，响应滚轮 / 触摸 / 指针 / 键盘中断和重复定位。原生 Tabs 指示器、涟漪、Drawer、Dialog、Collapse 动画交由 MDUI；没有大型动画库。自定义 CSS 负责布局、排版与公开 Parts，不重复实现已有组件。

## 验证

```sh
npm run check
npm run build
python3 -m pip install -r tests/requirements.txt
python3 tests/browser_audit.py --chromium /usr/bin/chromium --artifacts /tmp/nekomi-browser
```

测试只用 Python 静态文件服务器托管构建产物，覆盖无刷新导航、壁纸 / 图像身份、一次请求 / 解码、内容迁移完整性、直接访问与历史、原生组件、主题、复制与目录、八个指定视口及断点边界及明暗模式；还单独构建填充友链 / 评论的 fixture。详见 [测试说明](tests/README.md)与[本轮实测结果](tests/RESULTS.md)。

云环境验证通过 `--verified-cdn` 保留代理和 TLS 校验，仅对 Google Fonts 用 curl 获取原始响应后向 Chromium 回放；MDUI 全部由本地构建产物加载，不关闭证书验证；这不代表 Chromium 原生外部字体证书链已配置。交付截图的背景来自实际 API 样本。仅实测 Chromium，Firefox / Safari 尚未实测。

## 目录

```text
astro.config.mjs          静态构建、子路径、Markdown 插件
site.config.json          站点 / 主题 / 壁纸 / 友链 / 评论配置
src/
  layouts/SiteLayout.astro 公共布局与 ClientRouter
  components/            侧栏、导航、壁纸、卡片、目录等
  pages/index.astro      首页静态索引
  pages/posts/[id].astro  独立文章静态路由
  pages/404.astro         错误页面
  pages/article.html.ts   旧链接兼容入口
  content.config.ts      Content Collections schema
  assets/images/         Astro 优化的本地头像 / 封面 / 正文图片
  content/posts/*.md     十篇完整 Markdown 演示文章
  plugins/markdown.mjs   稳定标题 ID、代码 / 表格构建增强
  scripts/               单例运行时与可清理的页面增强
  styles/                复用 P1.1 样式与内容 View Transitions
public/                  不需优化的公开资源与壁纸 Worker
tests/                   静态产物浏览器回归与迁移基线
screenshots/             实际页面截图与录屏
dist/                    构建产物（不提交）
```

本轮止于 P2.2 工程优化；未新增评论后端、管理后台、分页或其他独立页面。许可见 [LICENSE](LICENSE) 与 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。
