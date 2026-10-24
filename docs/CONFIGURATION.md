# 配置参考

修改 `site.config.json` 后重新构建。未填写字段使用主题默认值；嵌套对象逐字段补全，数组整体替换。未知字段、重复模块、危险 URL、越界数值会在构建前报出完整字段路径。编辑器使用根目录 `site.schema.json` 补全；下面的默认值由同一 Zod schema 生成（`npm run config:docs`）。

最小起点见 [site.config.json](../site.config.json)，完整可复制配置见 [full.config.json](../examples/full.config.json)，另外提供 [Fresh](../examples/fresh.config.json)、[Minimal](../examples/minimal.config.json) 与 [原站个人配置](../examples/personal/site.config.json)。

## demo

全站示例保护；true 时禁止公开索引、RSS 条目与 Sitemap 条目。

## demoNotice

供导入方使用的示例说明，主题不渲染开发提示。

## site

站点身份。纯文本，不接受任意 HTML。social 支持 auto / github / bilibili 与 MDUI 图标名，链接为 HTTP(S)/mailto/站内路径。默认 auto 按真实平台域名或 mailto 识别；品牌 SVG 在本地，无新增字体请求。email 为空时不显示。

## publishing

发布与 SEO。url 仅源站，不带路径；base 以 / 开始和结束；环境变量 SITE_URL / SITE_BASE 优先。author 未填时使用站名。

## appearance

预设 default / fresh / minimal 提供 Token 默认值；显式字段优先。color 为六位主色，secondary 为空由 MDUI 推导，填写后使用 MDUI customColors 的完整语义色组。mode 仅决定首次默认，用户保存的偏好优先。字体为本地 CSS font-family，不自动下载字体。brandFont 独立控制站名、手机 App Bar 与身份文字，headingFont 只控制内容标题；更改正文 font 不会覆盖 brandFont。radius 控制卡片和阅读表面，按钮等 MDUI 控件保留原生形状角色。

## appearance.wallpaper

默认关闭。运行时加载 HTTP(S) 或 public/ 内图片，不在构建时固定随机 API。dark 留空复用 light。Overlay 为遮罩，Surface 为卡片，ReaderSurface 为阅读区；深浅分别设置。cacheHours=0 不注册壁纸 Worker。position 为 CSS object-position，fit 为 cover/contain。

## layout

width 为页面最大宽度（含栏和间距），readerWidth 为阅读容器最大宽度，sidebarWidth 为桌面栏宽；实际宽度仍受可用空间约束。固定 1120px 切 Drawer、1440px 启用右侧目录；数值范围保留至少约 680px 阅读空间。modules / sidebarTabs 数组按顺序渲染，可删项或用 [] 全关。模块：profile/social/search/tabs；侧栏 Tab：updates/friends/comments。评论关闭、recent=false 或内置服务不支持最新查询时隐藏评论 Tab。

## navigation

tabs 的 id 为 recent/categories/tags/archive；recent 必须启用，可改名。enabled 控制主导航可见性；分类/标签的直接索引页面由 content 开关控制。links 显示在公共侧栏底部。数组替换，不按位置合并。

## home

emptyTitle / emptyDescription 自定义无文章状态，空描述不输出段落。P3 标题区不再显示装饰文字或统计：eyebrow 仅保留旧配置输入兼容；description 改用于全部文章页的 SEO Description，留空沿用站点副标题。搜索计数由独立 live region 按需显示。

## cards

cover:auto 为响应式图文，top 始终图在上，none 隐藏。其余开关控制摘要、日期、分类、标签、阅读按钮及首篇强调；标题真实链接始终存在。

## reading

全站阅读默认值，可被文章 reading 同名字段覆盖。lightbox 开启正文未链接图片的灯箱，首次打开才加载库和样式；readingTime 开启构建时估计时长，Frontmatter readingTime 可为布尔值或指定分钟数；related 控制构建时相关文章，relatedLimit 为 0–6，默认 3。toc 关闭不渲染目录、不绑定章节滚动跟踪；copyCode 关闭不输出复制按钮；motion 控制阅读页自定义进入和目录弹簧。原生 MDUI 交互仍遵从系统减少动态设置。

## markdown

math / mermaid / components 默认 true，可由文章 markdown 同名字段覆盖。KaTeX 构建时渲染；Mermaid 仅在含图表的文章、图表接近视口时加载；交互组件仅在需要时初始化。组件语法、安全限制与关闭后的回退见 MARKDOWN.md。

## friendsPage

enabled 默认 true，生成独立 /friends/ 并让侧栏查看全部进入该页；false 不生成并保留旧 Dialog。navigation 默认 false，可开启公共侧栏 / Drawer 入口。复用 friends 数组，无数据正常显示空状态。

## content

infiniteScroll=false 禁用观察器自动加载，保留普通分页与手动加载。excerptLength 用于未填写 excerpt 的正文纯文本摘要；手写摘要不截断。categories/tags 同时控制导航、卡片、文章信息和静态分类/标签页面。

## features

RSS 入口位于 social 侧栏模块（含 Drawer），features.rss=false 时不自动显示；不会在默认页脚重复。移除 social 模块也会隐藏该入口，自动发现仍由 rss 开关控制。search 关闭同时移除搜索框、快捷键与 URL 查询搜索。rss 关闭时隐藏入口及自动发现、端点返回空频道；sitemap 关闭不加载集成，robots 不引用站点地图。

## footer

页脚开关、起始年份、纯文字说明、自定义版权（留空自动 © 年份 站名）、附加链接。默认 text 为空；自定义内容照常保留。RSS 自动入口不再放在页脚。

## friends

友链数组：name、HTTP(S) url、可选 avatar、description。为空时没有可点击的查看全部操作。

## comments

provider:none 默认关闭；link 为单篇站外讨论链接；waline/twikoo/giscus/artalk 为动态 SDK，custom 在构建时选择浏览器模块。lazy 控制视口懒加载，counts/recent 分别控制额外计数与侧栏查询，recentLimit 为 1–10，timeout 为 3000–60000ms。keyPrefix 为不带域名及部署 base 的稳定线程前缀。服务字段只能填写公开连接参数，不能放管理凭据。详见 COMMENTS.md / COMMENT-ADAPTERS.md。

## analytics

仅支持可选 Umami 外部脚本。默认不输出脚本；enabled=true 必须同时提供 scriptUrl 和 websiteId。脚本只载入一次，SPA 计数交由 Umami。不能把私密密钥写入配置。

## 字段、默认值与范围

| 字段 | 类型 / 枚举 | 默认值 | 范围 |
| --- | --- | --- | --- |
| `demo` | boolean | `true` | — |
| `demoNotice` | string | `"示例内容，请替换为自己的文章。"` | 长度 ≤ 1000 |
| `site.name` | string | `"Nekomi"` | 长度 ≥ 1，长度 ≤ 80 |
| `site.tagline` | string | `"分享技术、日常"` | 长度 ≤ 1000 |
| `site.intro` | string | `""` | 长度 ≤ 1000 |
| `site.avatar` | string | `""` | 长度 ≤ 2048 |
| `site.avatarAlt` | string | `"站点头像"` | 长度 ≤ 1000 |
| `site.avatarFallback` | string | `"N"` | 长度 ≤ 2 |
| `site.email` | string / string | `""` | — |
| `site.social` | array | `[]` | — |
| `publishing.url` | string | `""` | — |
| `publishing.base` | string | `"/"` | — |
| `publishing.language` | string | `"zh-CN"` | — |
| `publishing.indexing` | boolean | `false` | — |
| `publishing.pageSize` | integer | `6` | ≥ 2，≤ 24 |
| `publishing.author` | string | `""` | 长度 ≤ 1000 |
| `publishing.authorUrl` | string / string | `""` | — |
| `publishing.socialImage` | string | `""` | 长度 ≤ 2048 |
| `appearance.preset` | `default` / `fresh` / `minimal` | `"default"` | — |
| `appearance.color` | string | `"#8064b1"` | — |
| `appearance.secondary` | string / string | `""` | — |
| `appearance.mode` | `auto` / `light` / `dark` | `"auto"` | — |
| `appearance.font` | string | `"\"Segoe UI\", system-ui, -apple-system, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"` | 长度 ≥ 1，长度 ≤ 256 |
| `appearance.brandFont` | string | `"\"Avenir Next\", \"Hiragino Sans\", \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"` | 长度 ≥ 1，长度 ≤ 256 |
| `appearance.headingFont` | string | `"\"Noto Serif CJK SC\", \"Songti SC\", \"STSong\", ui-serif, serif"` | 长度 ≥ 1，长度 ≤ 256 |
| `appearance.radius` | integer | `20` | ≥ 8，≤ 28 |
| `appearance.wallpaper.enabled` | boolean | `false` | — |
| `appearance.wallpaper.light` | string | `""` | 长度 ≤ 2048 |
| `appearance.wallpaper.dark` | string | `""` | 长度 ≤ 2048 |
| `appearance.wallpaper.position` | string | `"center"` | 长度 ≤ 80 |
| `appearance.wallpaper.fit` | `cover` / `contain` | `"cover"` | — |
| `appearance.wallpaper.lightOverlay` | number | `0.6` | ≥ 0，≤ 1 |
| `appearance.wallpaper.darkOverlay` | number | `0.68` | ≥ 0，≤ 1 |
| `appearance.wallpaper.lightSurface` | number | `0.84` | ≥ 0.65，≤ 1 |
| `appearance.wallpaper.darkSurface` | number | `0.88` | ≥ 0.65，≤ 1 |
| `appearance.wallpaper.lightReaderSurface` | number | `0.97` | ≥ 0.85，≤ 1 |
| `appearance.wallpaper.darkReaderSurface` | number | `0.97` | ≥ 0.85，≤ 1 |
| `appearance.wallpaper.cacheHours` | number | `24` | ≥ 0，≤ 168 |
| `layout.width` | integer | `1440` | ≥ 1360，≤ 1600 |
| `layout.readerWidth` | integer | `760` | ≥ 680，≤ 800 |
| `layout.sidebarWidth` | integer | `320` | ≥ 280，≤ 320 |
| `layout.modules` | array | `["profile","social","search","tabs"]` | — |
| `layout.sidebarTabs` | array | `["updates","friends","comments"]` | — |
| `navigation.tabs` | array | `[{"id":"recent","label":"全部文章","enabled":true},{"id":"categories","label":"分类","enabled":true},{"id":"tags","label":"标签","enabled":true},{"id":"archive","label":"归档","enabled":true}]` | — |
| `navigation.links` | array | `[]` | — |
| `home.eyebrow` | string | `""` | 长度 ≤ 1000 |
| `home.description` | string | `""` | 长度 ≤ 1000 |
| `home.emptyTitle` | string | `"暂无文章"` | 长度 ≤ 1000 |
| `home.emptyDescription` | string | `""` | 长度 ≤ 1000 |
| `cards.cover` | `auto` / `top` / `none` | `"auto"` | — |
| `cards.excerpt` | boolean | `true` | — |
| `cards.date` | boolean | `true` | — |
| `cards.category` | boolean | `true` | — |
| `cards.tags` | boolean | `true` | — |
| `cards.readMore` | boolean | `true` | — |
| `cards.latest` | boolean | `true` | — |
| `reading.lightbox` | boolean | `true` | — |
| `reading.readingTime` | boolean | `true` | — |
| `reading.related` | boolean | `true` | — |
| `reading.relatedLimit` | integer | `3` | ≥ 0，≤ 6 |
| `reading.toc` | boolean | `true` | — |
| `reading.copyCode` | boolean | `true` | — |
| `reading.cover` | boolean | `true` | — |
| `reading.metadata` | boolean | `true` | — |
| `reading.neighbors` | boolean | `true` | — |
| `reading.motion` | boolean | `true` | — |
| `markdown.math` | boolean | `true` | — |
| `markdown.mermaid` | boolean | `true` | — |
| `markdown.components` | boolean | `true` | — |
| `friendsPage.enabled` | boolean | `true` | — |
| `friendsPage.navigation` | boolean | `false` | — |
| `content.infiniteScroll` | boolean | `true` | — |
| `content.excerptLength` | integer | `140` | ≥ 40，≤ 400 |
| `content.categories` | boolean | `true` | — |
| `content.tags` | boolean | `true` | — |
| `features.search` | boolean | `true` | — |
| `features.rss` | boolean | `true` | — |
| `features.sitemap` | boolean | `true` | — |
| `footer.enabled` | boolean | `true` | — |
| `footer.since` | integer | `2026` | ≥ 1970，≤ 2100 |
| `footer.text` | string | `""` | 长度 ≤ 1000 |
| `footer.copyright` | string | `""` | 长度 ≤ 1000 |
| `footer.links` | array | `[]` | — |
| `friends` | array | `[]` | — |
| `comments.provider` | `none` / `link` / `waline` / `twikoo` / `giscus` / `artalk` / `custom` | `"none"` | — |
| `comments.lazy` | boolean | `true` | — |
| `comments.counts` | boolean | `true` | — |
| `comments.recent` | boolean | `true` | — |
| `comments.recentLimit` | integer | `4` | ≥ 1，≤ 10 |
| `comments.timeout` | integer | `15000` | ≥ 3000，≤ 60000 |
| `comments.keyPrefix` | string | `"/posts/"` | — |
| `comments.waline.serverURL` | string / string | `""` | — |
| `comments.waline.lang` | string | `"zh-CN"` | 长度 ≤ 1000 |
| `comments.waline.login` | `enable` / `disable` / `force` | `"enable"` | — |
| `comments.twikoo.envId` | string / string / string | `""` | — |
| `comments.twikoo.region` | string | `""` | 长度 ≤ 1000 |
| `comments.twikoo.lang` | string | `"zh-CN"` | 长度 ≤ 1000 |
| `comments.giscus.repo` | string | `""` | — |
| `comments.giscus.repoId` | string | `""` | 长度 ≤ 1000 |
| `comments.giscus.category` | string | `""` | 长度 ≤ 1000 |
| `comments.giscus.categoryId` | string | `""` | 长度 ≤ 1000 |
| `comments.giscus.lang` | string | `"zh-CN"` | 长度 ≤ 1000 |
| `comments.giscus.reactions` | boolean | `true` | — |
| `comments.artalk.server` | string / string | `""` | — |
| `comments.artalk.site` | string | `""` | 长度 ≤ 1000 |
| `comments.artalk.locale` | string | `"zh-CN"` | 长度 ≤ 1000 |
| `comments.custom.module` | string | `""` | — |
| `comments.custom.options` | object | `{}` | — |
| `comments.assets.script` | string | `""` | 长度 ≤ 2048 |
| `comments.assets.css` | string | `""` | 长度 ≤ 2048 |
| `comments.assets.integrity` | string | `""` | — |
| `comments.assets.cssIntegrity` | string | `""` | — |
| `comments.anchorsEnabled` | boolean | `false` | — |
| `comments.items` | array | `[]` | — |
| `analytics.enabled` | boolean | `false` | — |
| `analytics.provider` | string | `"umami"` | — |
| `analytics.scriptUrl` | string / string | `""` | — |
| `analytics.websiteId` | string | `""` | 长度 ≤ 100 |

## 接口与依赖

- social: `{ name, url, icon? }`；icon 默认 auto，自动识别 github.com、bilibili.com / b23.tv、mailto；其他链接使用 link。可显式填 github / bilibili / link / mail--outlined 或原有 MDUI 图标名。链接不接受 javascript: / data:。
- friends: `{ name, url, avatar?, description? }`，没有头像仍保留文字回退。
- navigation.tabs: `{ id, label, enabled? }`；links/footer.links: `{ label, url }`。
- comments.items / anchorsEnabled 为旧预览兼容：仅 provider=none/link 且 demo:true 的行会显示“示例留言”，非 demo 行不再作为正常数据源。动态服务忽略该数组。
- comments.provider=link 仅在文章填写有效 HTTP(S) commentsUrl 时显示“参与讨论”。动态适配器通过统一 CommentAdapter 管理生命周期；assets 可显式覆盖可信的 SDK / CSS 地址与 SRI。custom.module 必须是项目内已有 TS/JS/MJS 文件，custom.options 仅接受可公开的 JSON。具体服务最小配置、能力差异、稳定键迁移和安全说明见 [评论接入](COMMENTS.md)；自建模块见 [适配器开发](COMMENT-ADAPTERS.md)。
- 头像/封面使用 images/name.jpg 对应 src/assets/images/name.jpg，可由 Astro 优化；public/images/name.jpg 使用 /images/name.jpg。壁纸必须使用 public 路径或 HTTP(S) 地址。图片缺失沿用回退。
- 全站预览的 demo:true、publishing.indexing:false 默认保护示例。发布真实内容需要 demo:false、indexing:true 和真实 url；每篇 demo:true 仍被排除。draft:true 始终不生成文章页、列表、搜索、RSS。
- 搜索覆盖全部公开文章元数据；分页大小在 publishing.pageSize 配置，2–24，默认 6。置顶优先，再按日期倒序；RSS 始终按日期。关闭 JS 仍有真实分页与分类链接。
- layout.modules 不包含 search 时也不安装 / 搜索快捷键；features.search=false 还会关闭查询搜索。侧栏为空仍保留手机 App Bar 与主题控制。
- reading.motion=false 控制阅读扩展动画；系统 prefers-reduced-motion 对全站所有自定义及 MDUI 动画优先。
- NEKOMI_CONFIG 指向一份完整用户配置（相对于主题默认值，不继承 site.config.json）；NEKOMI_CONTENT_DIR 指向 Markdown 目录。两者可用于独立维护个人配置/文章。只使用受信任的 Markdown，支持原始 HTML，不将其作为不可信投稿接口。
