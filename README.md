# Nekomi · 小林的小窝

基于 **MDUI 2.1.5 / Material Design 3** 的原创静态博客主题。参考 Stellar 的融入式侧栏、内容导航与辅助目录，以及 G 的文章信息层次和阅读节奏；所有页面代码独立实现。

P1.1 已统一首页与阅读页的视觉、默认 API 壁纸、评论预览接口与轻弹簧目录滚动。继续使用 HTML、CSS、原生 JavaScript，不绑定博客框架，没有构建步骤。全部文章、日期与叙事均为演示，不代表站长的真实经历。

!| 页面 | 桌面浅色 / 深色 | 手机浅色 / 深色 |
| --- | --- | --- |
| 首页 | [浅色](screenshots/p11-home-desktop-light-1440x900.png) · [深色](screenshots/p11-home-desktop-dark-1440x900.png) | [浅色](screenshots/p11-home-mobile-light-390x844.png) · [深色](screenshots/p11-home-mobile-dark-390x844.png) |
| 阅读 | [浅色](screenshots/p11-article-desktop-light-1440x1000.png) · [深色](screenshots/p11-article-desktop-dark-1440x1000.png) | [浅色](screenshots/p11-article-mobile-light-390x844.png) · [深色](screenshots/p11-article-mobile-dark-390x844.png) |

[演示评论](screenshots/p11-comments-desktop-1440x900.png) · [手机评论](screenshots/p11-comments-mobile-390x844.png) · [实际动效录屏](screenshots/p11-motion-390x844.webm)

截图背景为站长 API 实际返回且经检查的图片，不是生成素材；演示评论只在截图和测试中临时注入，默认配置为空。

## 本地开发

在仓库根目录启动任意静态 HTTP 服务：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

访问本地 8080 端口。阅读演示地址：

- 技术长文：`article.html?post=css-grid-two-column-blog`
- 虚构随笔：`article.html?post=weekend-walk-by-river`
- 章节深链接：`article.html?post=css-grid-two-column-blog#grid-minimum`

需要 HTTP 服务，不能直接以 `file://` 打开。运行时需能访问 `unpkg.com`、`fonts.googleapis.com` 与 `fonts.gstatic.com`。MDUI CSS / JS 均固定为 **2.1.5**，继续通过 unpkg 引入。

## 页面与原生组件

- **公共外壳**：`site.js` 复用侧栏、移动 App Bar、Navigation Drawer、页尾和 Snackbar。全站侧栏为 320px、页面最大宽度 1440px；保持透明、无整体边框 / 圆角 / 阴影。只有短屏需要侧栏自身的一层滚动，面板内部没有额外滚动区。
- **首页**：保留 Tabs / Tab Panel、Card、Chip、List / List Item；浅紫色页面搭配樱粉、清蓝分类色，首篇使用原生 filled Card，其余文章保留轻轮廓。卡片减少过量留白，标题、元信息、两行摘要与操作分级；个人区使用横向头像、衬线站名和简洁简介，有图与无图布局均完整。分类、标签、归档和最近更新由同一份元数据推导；标题、封面、按钮和原生列表项均使用真实文章链接。
- **侧栏 Tabs**：桌面与 Drawer 共用原生 Tabs / Tab Panel，默认最近更新，原位切换友链 / 最近评论；预览最多五个站点，显示头像 / 名称 / 简介。“查看全部”在原生 Dialog 中展示全部配置，移动端先关闭 Drawer，保持原生焦点返回。无友链时保留空状态并禁用该入口。最近评论展示作者、头像回退、摘要、文章与时间；没有后端时只进入文章，不虚构评论定位。
- **阅读页**：标题、日期、分类、标签、可选头图；正文提供多级标题、段落、引用、列表、图片、分割线、表格与代码排版。桌面正文上限 760px，手机保持单列。
- **目录**：按 h2–h6 自动生成嵌套列表，支持当前章节、标题永久链接与焦点定位。1360px 起放在右侧，较窄屏幕使用原生 Collapse；不挤占正文空间。
- **技术内容**：代码块显示语言，原生 Button 复制原始文本，Snackbar 反馈；长代码和宽表格在自身区域横向滚动，支持键盘访问。
- **移动端**：860px 及以下使用原生 Top App Bar 和模态 Navigation Drawer；App Bar 在文档流中占位并吸顶，组件负责抽屉焦点约束、滚动锁定、Escape / 遮罩关闭。
- **主题**：图标按钮依次切换“浅色 → 深色 → 跟随系统”，同时显示当前模式与下次动作；`setColorScheme()` 从可配置主色生成语义色，并通过官方 `customColors` 生成樱粉与清蓝的明暗角色，`setTheme()` 管理主题，偏好跨页面保存。没有主题下拉菜单。
- **壁纸**：全站可配置浅色 / 深色图片和裁切位置，默认启用站长提供的图片 API；使用可配置的明暗遮罩、左侧渐隐和阅读表面维持可读性。图片解码后淡入，失败恢复默认表面；壁纸专用 Worker 缓存随机图片，跨页和刷新复用。
- **过渡**：页面内容与首页 Tab 面板使用短暂的非线性滑入，正常文档链接保留分享、新标签页和浏览器历史；减少动态效果偏好下禁用自定义过渡。

CSS 主要负责布局与文章排版，组件调整使用官方公开 CSS Parts / 变量。没有复制 G 的 PHP、CSS、JavaScript 或素材，也没有添加其他 UI 框架或美术资源。许可与参考范围见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

## 动效与阅读导航

MDUI 2.1.5 的 Tabs 指示器、涟漪、Drawer、Dialog 和 Collapse 仍使用组件原生动画。自定义部分统一在 `tokens.css` / `motion.js`：内容进入 360ms，反馈 220ms，背景淡入 650ms。首页卡片提供轻量 Hover / Press / Focus 反馈，搜索结果与 Tab 内容复用进入过渡；目录当前章节平滑变色，主题切换过渡背景和阅读表面。没有引入动画库。

目录点击使用 `requestAnimationFrame` 小步弹簧积分（质量 1、刚度 220、阻尼 28，接近临界阻尼），最后准确吸附到标题偏移并限制文档边界；目标位置随布局变化重新计算。滚轮、触摸、指针、导航键和再次点击可取消或重新定位，折叠目录改变高度时等原生 Collapse 完成后再定位。真实 Hash 链接、键盘焦点与前进后退保留。

`prefers-reduced-motion: reduce` 下目录立即定位，内容进入与卡片位移动效关闭，MDUI 和背景过渡缩至 1ms。原生动画没有被全局删除。

## 配色与全站壁纸

在 `assets/js/data.js` 的 `appearance` 中配置：

```js
appearance: {
  color: '#8064b1',
  wallpaper: {
    enabled: true,
    light: 'https://www.nekopara.uk/pic_api',
    dark: '',              // 空值沿用同一图片，减少主题切换时的随机变化
    position: 'center',    // CSS object-position，例如 '65% 30%'
    fit: 'cover',          // cover 铺满 / contain 完整显示
    lightOverlay: .64,     // 0–1，全局浅色遮罩
    darkOverlay: .68,      // 0–1，全局深色遮罩
    lightSurface: .90,     // .65–1，正文和卡片表面
    darkSurface: .92,
    cacheHours: 24         // 1–168；0 禁用专用缓存
  }
}
```

关闭背景可设置 `enabled: false` 或将图片地址留空。仅配置 `dark` 时浅色模式不显示壁纸；也可换成站长自有的固定图片地址。主色接受 3 位或 6 位十六进制值，无效配置回退默认值。遮罩降低后应重新检查对比度；侧栏采用连续渐隐，没有添加独立背景卡片。阅读页使用一块稳定的正文表面，不将所有区域玻璃化。

2026-10-23 实测 API：`/pic_api` **301** 到 `/pic_api/`，再 **302** 到对象存储，最终为 **200 image/png**，不是 JSON；样本为 2220×1380、4,248,854 字节，另一次请求跳转到不同图片。随机响应未给出稳定的 Cache-Control / Expires，观察到 `CF-Cache-Status: DYNAMIC`、FastCGI MISS / EXPIRED；最终图片有 ETag / Last-Modified。重定向本身没有开放 CORS，因此不依赖跨域 fetch 读取最终 URL，也不假设图片域名固定。

`wallpaper-cache.js` 只拦截本站 `__nekomi_wallpaper` 的图片请求，以 no-cors 获取并缓存原始 opaque 响应；默认 24 小时内复用，最多保留两张不同配置的图片。同源标签页并发请求合并；缓存不可用时仍可展示网络图片；图片解码失败会清除错误缓存。它不缓存页面、脚本、文章或提供离线博客。需要 HTTPS 或 localhost；没有 Service Worker 时退回普通图片加载，随机图片跨页复用能力相应受限。全站背景使用低优先级异步解码，不阻塞正文；首次加载先显示 MD3 表面，主题初始底色在 head 中提前设置。

API 当前返回的图片可较大，不支持已确认的缩略图参数，因此没有臆造裁切 URL；手机同样复用缓存，不重复请求随机大图。若需要严格控制内容或首次下载体积，请配置经站长审核和压缩的固定图片。随机池的后续内容和可用性由 API 维护者控制，主题不能保证每次返回的素材及其授权。

## 数据与正文

编辑 [`assets/js/data.js`](assets/js/data.js) 配置站点、文章元数据与友链：

```js
{
  id: 'example-post',
  title: '文章标题',
  excerpt: '用于首页和搜索的摘要。',
  date: '2026-10-20',
  category: '前端',
  tags: ['CSS'],
  content: 'content/posts/example-post.html',
  cover: '',
  coverAlt: ''
}
```

正文存放在 [`content/posts/`](content/posts/)，不重复页头与 h1。两篇主要样本分别展示技术长文与普通随笔，其余八篇也有独立正文。详细约定及生成器迁移边界见 [content/README.md](content/README.md)。

- 没有封面时不创建空图片位；首页宽卡片右图、窄卡片上图，阅读页头图独立显示。
- 坏封面收起，坏正文图保留替代文字提示，头像失败回退文字。
- 默认不添加封面或虚构友链。友链格式为 `name`、`url`、`avatar`、`description`，侧栏预览最多 5 个，完整列表使用同一份配置。头像缺失或失败均回退为名称首字。
- 搜索标题、摘要、分类与标签，不搜索正文；首页 `?q=关键词#recent` 可独立分享。文章页搜索输入后按 Enter 返回首页结果。
- 无效文章 ID 显示友好提示与返回入口；正文载入失败可重试。静态演示错误界面仍是 HTTP 200，正式发布时应由生成器或服务器提供真正的 404。

封面示例：[桌面右图](screenshots/cover-layout-desktop-1440x900.png) · [手机上图](screenshots/cover-layout-mobile-390x844.png)。测试临时使用本项目界面截图，默认数据保持无封面。图片接入见 [assets/images/README.md](assets/images/README.md)。

## 最近评论数据接口

默认 `comments.items` 为空。未来评论提供方只需输出统一数据，不需要修改侧栏渲染：

```js
comments: {
  anchorsEnabled: false, // 只有真实评论节点已接入后才启用
  items: [{
    id: 'demo-1', author: '演示访客', avatar: '',
    excerpt: '这是一条 UI 测试留言。',
    postId: 'css-grid-two-column-blog',
    createdAt: '2026-10-23T08:30:00+08:00',
    anchor: '', demo: true
  }]
}
```

按有效时间降序预览最近四条；未知文章、无效日期和缺失作者 / 内容的条目忽略。`demo: true` 明确显示“演示”。默认点击只进入文章；只有 `anchorsEnabled: true` 且提供 `anchor` 时生成评论 Hash，请未来接入方保证该节点真实存在。当前没有编写评论表单、后台或评论服务。

## 键盘与历史

- 首页 Tabs 支持方向键 / Home / End，状态与 Hash 同步；搜索参数可刷新恢复。
- `/` 聚焦搜索；手机上打开抽屉并通过原生 `autofocus` 聚焦。输入框内的 `/` 正常输入。
- 首页搜索支持空结果、原生清空、可删除关键词 Chip；桌面 Escape 清空，手机 Escape 关闭抽屉；Enter 进入首个结果焦点或空结果标题。
- 文章目录使用真实片段链接，点击后聚焦目标标题；直接打开、刷新、前进后退均能恢复章节。上一篇 / 下一篇和返回列表使用原生链接。
- 提供跳过导航、可见焦点、可访问名称、存储不可用回退与减少动效支持。

MDUI 2.1.5 尚未提供完整的 Tabs 键盘 / ARIA 与图标按钮 ARIA 转发。[`a11y.js`](assets/js/a11y.js) 只补齐固定版本缺失能力，不重做面板管理、组件视觉或模态焦点机制。

## 验证

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium --artifacts /tmp/nekomi-browser
```

覆盖 P0 / P0.5 / P0.6 / P1 / P1.1 的浏览器回归，详见 [tests/README.md](tests/README.md)。截图由实际 Chromium 页面生成，包含桌面与手机明暗模式。

当前云环境使用 `--verified-cdn`：curl 保持代理与 TLS 校验，取得原始 CDN 响应后在 Chromium 中回放。它不更改应用的 CDN 地址、资源或浏览器信任库，不关闭证书验证；测试验证页面行为，不代表 Chromium 原生 CDN 证书链已配置。Firefox / Safari 尚未实测。

当前功能边界为首页与文章阅读：未开发评论后端、后台、分页、服务端搜索或静态生成器。正文载入与公共组件增强依赖 JavaScript；生产环境的静态正文、SEO 与路由输出留给未来选定的生成器。

## 文件

```text
index.html                首页 Tabs 与索引容器
article.html              阅读页语义结构
assets/css/tokens.css     共用布局尺度与减少动效令牌
assets/css/main.css       公共布局、首页和公开 CSS Parts
assets/css/home.css       首页比例、阅读密度与 Tabs 状态表面
assets/css/article.css    阅读排版与目录响应式布局
assets/js/data.js         文章元数据索引
assets/js/site.js         公共外壳、真实路由与搜索入口
assets/js/a11y.js         固定 MDUI 版本的必要无障碍补充
assets/js/theme.js        MD3 色板、三态主题按钮与壁纸载入
assets/js/motion.js       内容进入与可中断弹簧滚动
wallpaper-cache.js        仅处理壁纸的缓存 Worker
assets/js/app.js          首页渲染、筛选与 URL 状态
assets/js/article.js      正文载入、目录、锚点与复制
content/posts/            独立、可信的演示正文片段
screenshots/              实际浏览器截图
tests/                    P0 / P1 浏览器回归
```

本项目采用 [MIT License](LICENSE)。
