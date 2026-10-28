# 配置参考

**第一次配置？先看 [简明配置指南](CONFIGURATION-GUIDE.md)**，按需求修改名称、头像、主题色、壁纸、侧栏、页脚和评论；分类配色、文案、日期、导航和字体的进阶示例见 [个性化配置](PERSONALIZATION.md)。[返回 README](../README.md)。

修改 `site.config.json` 后重新构建。未填写字段使用主题默认值；嵌套对象逐字段补全，数组整体替换。未知字段、重复模块、危险 URL、越界数值会在构建前报出完整字段路径。编辑器使用根目录 [site.schema.json](../site.schema.json) 补全；下面的默认值由同一 Zod schema 生成（`npm run config:docs`），无需手动维护参数表。

最小起点见 [site.config.json](../site.config.json)，完整可复制配置见 [full.config.json](../examples/full.config.json)，另外提供 [Fresh](../examples/fresh.config.json)、[Minimal](../examples/minimal.config.json) 与 [原站个人配置](../examples/personal/site.config.json)。

## 目录

- [站点信息](#site) · [界面文案](#ui)
- [外观与预设](#appearance) · [字体](#appearancewebfonts) · [语义色](#appearancesemanticcolors) · [壁纸](#appearancewallpaper) · [角色装饰](#appearancedecorations)
- [侧栏与布局](#layout) · [常驻模块](#layoutsidebarsections) · [友链数据](#friends) · [友链页面](#friendspage)
- [导航](#navigation) · [独立页面 Tabs](#navigationpagetabs)
- [文章与分类](#content) · [首页](#home) · [文章卡片](#cards) · [阅读](#reading) · [Markdown](#markdown)
- [评论](#comments) · [自定义脚本](#scripts) · [第三方统计](#analytics)
- [页脚与版权](#footer)
- [发布与 SEO](#publishing) · [示例保护](#demo) · [兼容说明](#demonotice) · [搜索与 RSS / Sitemap 开关](#features)
- [全部字段、默认值与范围](#字段默认值与范围)
- [接口与依赖](#接口与依赖)

## scripts

默认 global / byPage 均为 []；支持 public/ 内 JS/MJS 和可信 HTTPS 资源，type 为 module/classic，position 为 head/body-end，enabled 默认 true、integrity 默认空。资源只执行一次，页面生命周期重新 mount / 清理；不支持 JSON 内联代码。head/body-end 是运行时异步插入位置，不阻塞 HTML 解析。资源重复、选项冲突及启用的本地文件缺失会报错。接口、安全与完整示例见 [自定义脚本](SCRIPTS.md)。

## layout.sidebarSections

默认 null，沿用旧 sidebarTabs；非 null 数组完整替代它。每项 id 为 updates/friends/comments，display 为 tab 或 standalone；standalone 的 position 为 above/below，默认 below，tab 不接受 position。各组按数组顺序排列，模块不可重复；[] 隐藏补充区域，全 standalone 不渲染空 Tabs。仍位于 layout.modules 的 tabs 插槽内，名称/预览限制沿用原配置。最新评论按活动 Tab 或独立模块可见性加载，关闭 Drawer 不查询。见 [侧栏布局](SIDEBAR.md)。

## navigation.pageTabs

默认 []，最多 8 项，slug/label 必填、enabled 默认 true。引用 pages 集合的非草稿页面，启用的引用不存在/为草稿时构建报错；重复引用/路由冲突报错。数组顺序决定四个内建 Tabs 后的追加顺序；是真实 Markdown 面板，页面仍有独立 URL。项目未启用不影响原首页，普通链接继续使用 topLinks/links。见 [独立页面](PAGES.md)。

## demo

全站示例保护；true 时禁止公开索引、RSS 条目与 Sitemap 条目。

## demoNotice

供导入方使用的示例说明，主题不渲染开发提示。

## site

站点身份。纯文本，不接受任意 HTML。social 支持 auto / github / bilibili 与 MDUI 图标名，链接为 HTTP(S)/mailto/站内路径。默认 auto 按真实平台域名或 mailto 识别；品牌 SVG 在本地，无新增字体请求。email 为空时不显示。favicon / appleTouchIcon 使用 public/ 内路径或公开 HTTP(S) URL，自动补部署 base；省略或留空自动使用主题内置 favicon.svg 与 180×180 apple-touch-icon.png，不必将默认路径写入配置。自定义图标优先，SVG 声明 image/svg+xml；这两项与 site.avatar 独立。详见 [图标配置](CONFIGURATION-GUIDE.md#浏览器与设备图标) 和 [品牌资源](BRANDING.md)。

## publishing

language 控制 HTML / SEO 语言与 Intl 日期格式，不自动翻译界面或第三方组件；通过 ui 显式覆盖主题文案，SDK 继续使用自己的 lang / locale。timeZone 为显示时间戳的有效时区（默认 Asia/Shanghai）；date / updated 是日历日期，永远不做时区偏移。页脚年份也按配置时区。发布与 SEO。url 仅源站，不带路径；base 以 / 开始和结束；环境变量 SITE_URL / SITE_BASE 优先。author 未填时使用站名。

## ui

集中管理主题自有文案，按 common / navigation / home / sidebar / search / reading / theme / comments / lightbox / markdown 分组。逐字段覆盖、缺省中文；仅纯文本，不解释 HTML。模板必须保留原有 {count} / {title} 等占位符，构建前校验；不会改写文章、评论正文、作者自写指令标题或 SDK 内部语言。ui.sidebar.updates / friends / comments 控制三个侧栏 Tab 名称，内部 ID 与 layout.sidebarTabs 顺序不变；不要用空白文案隐藏模块。参见 PERSONALIZATION.md。

## appearance.webFonts

可选本地 / HTTPS WOFF2 资源数组，默认 [] 不加载。每项 family、src 必填；weight 为 1–1000 或递增区间字符串，默认 400；style normal/italic；preload 默认 false。最多六项，固定 font-display:swap；在 font / brandFont / headingFont 字体栈中引用 family 才会按需使用。建议文件放 public/fonts，部署 base 自动补齐；不要添加不必要的预加载。

## appearance.semanticColors

success / warning 为可复用语义色源，沿用原默认值，交由 MDUI 生成完整浅深色组；用于 Markdown 提示等组件，也可作为分类颜色角色。旧 blossom / sky 专用色源已移除，分类改由 categoryColors 配置。

## appearance

预设 default / fresh / minimal 提供 Token 默认值；显式字段优先。color 为六位主色，secondary 为空由 MDUI 推导，填写后使用 MDUI customColors 的完整语义色组。mode 仅决定首次默认，用户保存的偏好优先。字体为本地 CSS font-family，不自动下载字体。brandFont 独立控制站名、手机 App Bar 与身份文字，headingFont 只控制内容标题；更改正文 font 不会覆盖 brandFont。radius 控制卡片和阅读表面，按钮等 MDUI 控件保留原生形状角色。

## appearance.wallpaper

默认关闭。运行时加载 HTTP(S) 或 public/ 内图片，不在构建时固定随机 API。dark 留空复用 light。1120px 以下使用 mobileLight / mobileDark；未设置时分别回退 light / dark（dark 也未设置再用 light）；仅有 mobileLight 时深色也可使用它。断点切换才重新选源，内部导航保留原 DOM / 已加载图片及缓存架构。Overlay 为遮罩，Surface 为卡片，ReaderSurface 为阅读区；深浅分别设置。cacheHours=0 不注册壁纸 Worker。position 为 CSS object-position，fit 为 cover/contain。

## appearance.decorations

sidebar / comments 各自独立，默认 enabled=false。light / dark 是 public/ 内图片路径或 HTTPS 地址；dark 留空复用 light，仅填 dark 时两种模式均使用它。width 64–320px、opacity 0–1、offsetX / offsetY -64–64px、align right/center；mobile=false 默认不在窄屏评论及 Drawer 展示。enabled=false、来源为空或 opacity=0 不渲染占位也不请求图片。侧栏按实际剩余高度缩放，不足 120px 隐藏；不覆盖内容和设置。评论宽屏独立右栏，窄阅读区退化为上方小图，移动端可选小图；偏移受安全边界约束，详见 DECORATIONS.md。

## layout

backToTop 默认 true，启用全站原生 mdui-fab 返回顶部；滚动超过 400px 显示，模态 / 灯箱 / 提示条打开时暂时隐藏，减少动态时立即回顶。ui.navigation.backToTop 设置无障碍名称；false 不渲染按钮或加载对应脚本。width 为页面最大宽度（含栏和间距），readerWidth 为阅读容器最大宽度，sidebarWidth 为桌面栏宽；实际宽度仍受可用空间约束。固定 1120px 切 Drawer、1440px 启用右侧目录；数值范围保留至少约 680px 阅读空间。modules / sidebarTabs 数组按顺序渲染，可删项或用 [] 全关。模块：profile/social/search/tabs；侧栏 Tab：updates/friends/comments。recentPostsLimit / friendsPreviewLimit 为预览数量，0–12，默认 5；0 隐藏相应 Tab，友链独立页不受影响。评论关闭、recent=false 或内置服务不支持最新查询时隐藏评论 Tab。

## navigation

tabs 的 id 为 recent/categories/tags/archive；recent 必须启用，可改名。enabled 控制主导航可见性；分类/标签的直接索引页面由 content 开关控制。links 显示在公共侧栏底部。topLinks 为独立顶部导航行，含 label / url / enabled（默认 true）/ newTab（默认 false），数组顺序即显示顺序；不伪装成 Tab，不生成面板或页面。站内 / 路径补 base 并走 ClientRouter，HTTP(S) 外链正常跳转，新窗口附安全 rel；空数组 / 全禁用不输出占位。数组替换，不按位置合并。

## home

emptyTitle / emptyDescription 自定义无文章状态，空描述不输出段落。P3 标题区不再显示装饰文字或统计：eyebrow 仅保留旧配置输入兼容；description 改用于全部文章页的 SEO Description，留空沿用站点副标题。搜索计数由独立 live region 按需显示。

## cards

cover:auto 为响应式图文，top 始终图在上，none 隐藏。example / pinned 仅控制示例 / 置顶角标，不改变 demo SEO 保护、pinned 排序。其余开关控制摘要、日期、分类、标签、阅读按钮及首篇强调；标题真实链接始终存在。

## reading

全站阅读默认值，可被文章 reading 同名字段覆盖。lightbox 开启正文未链接图片的灯箱，首次打开才加载库和样式；readingTime 开启构建时估计时长，Frontmatter readingTime 可为布尔值或指定分钟数；related 控制构建时相关文章，relatedLimit 为 0–6，默认 3。toc 关闭不渲染目录、不绑定章节滚动跟踪；copyCode 关闭不输出复制按钮；motion 控制阅读页自定义进入和目录弹簧。原生 MDUI 交互仍遵从系统减少动态设置。

## markdown

math / mermaid / components 默认 true，可由文章 markdown 同名字段覆盖。KaTeX 构建时渲染；Mermaid 仅在含图表的文章、图表接近视口时加载；交互组件仅在需要时初始化。组件语法、安全限制与关闭后的回退见 MARKDOWN.md。

## friendsPage

enabled 默认 true，生成独立 /friends/ 并让侧栏查看全部进入该页；false 不生成并保留旧 Dialog。navigation 默认 false，可开启公共侧栏 / Drawer 入口。复用 friends 数组，无数据正常显示空状态。

## content

categoryColors 按分类显示名映射 primary / secondary / tertiary / error / success / warning 或六位 HEX；默认 {} 全部回退 primary。HEX 经 MDUI 生成完整色组，最多 64 项、同色去重，不直接作明暗通用颜色。defaultCategory 为未分类文章的显示名称；内部以 null 分类键判断，兼容省略、空分类及旧值未分类，显示名称不参与推荐逻辑。categoryPreviewLimit / archivePreviewLimit 为 0–12，默认各 3；0 不渲染预览列表，静态分类归档链接与全量文章不受影响。infiniteScroll=false 禁用观察器自动加载，保留普通分页与手动加载。excerptLength 用于未填写 excerpt 的正文纯文本摘要；手写摘要不截断。categories/tags 同时控制导航、卡片、文章信息和静态分类/标签页面。

## features

RSS 入口位于 social 侧栏模块（含 Drawer），features.rss=false 时不自动显示；不会在默认页脚重复。移除 social 模块也会隐藏该入口，自动发现仍由 rss 开关控制。search 关闭同时移除搜索框、快捷键与 URL 查询搜索。rss 关闭时隐藏入口及自动发现、端点返回空频道；sitemap 关闭不加载集成，robots 不引用站点地图。

## footer

enabled 控制整个页脚；since 为创站年份，自动版权按配置时区的构建年份生成单年或年份范围。copyright 留空自动显示 © 年份 站名，非空完整替换自动版权，不做模板插值；text 与 links 依次追加。默认 text 为空、links 为 []，RSS 自动入口在侧栏。实际效果与可复制示例见 [简明指南的页脚与版权](CONFIGURATION-GUIDE.md#页脚与版权)。

## friends

友链数组：name、HTTP(S) url、可选 avatar、description。为空时没有可点击的查看全部操作。

## comments

provider:none 默认关闭；link 为单篇站外讨论链接；waline/twikoo/giscus/artalk 为动态 SDK，custom 在构建时选择浏览器模块。lazy 控制视口懒加载，counts/recent 分别控制额外计数与侧栏查询，recentLimit 为 1–10，timeout 为 3000–60000ms。keyPrefix 为文章稳定线程前缀，pageKeyPrefix 为独立页面前缀（默认 /pages/），均不带域名及部署 base。页面评论默认关闭，启用后与文章身份校验冲突。服务字段只能填写公开连接参数，不能放管理凭据。详见 COMMENTS.md / COMMENT-ADAPTERS.md。

## analytics

仅支持可选 Umami 外部脚本。默认不输出脚本；enabled=true 必须同时提供 scriptUrl 和 websiteId。脚本只载入一次，SPA 计数交由 Umami。不能把私密密钥写入配置。

## 字段、默认值与范围

| 字段 | 类型 / 枚举 | 默认值 | 范围 |
| --- | --- | --- | --- |
| `demo` | boolean | `true` | — |
| `demoNotice` | string | `"示例内容，请替换为自己的文章。"` | 长度 ≤ 1000 |
| `ui.common.close` | string | `"关闭"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.viewAll` | string | `"查看全部"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.backToPosts` | string | `"返回文章列表"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.readArticle` | string | `"阅读文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.readTitle` | string | `"阅读文章：{title}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.readMore` | string | `"阅读全文"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.previousPage` | string | `"上一页"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.nextPage` | string | `"下一页"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.page` | string | `"第 {page} 页"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.postCount` | string | `"{count} 篇"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.viewPosts` | string | `"查看 {count} 篇"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.siteCount` | string | `"{count} 个站点"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.totalSites` | string | `"共 {count} 个站点。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.common.visit` | string | `"访问 {name}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.openPage` | string | `"独立打开"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.backToTop` | string | `"返回顶部"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.siteInfo` | string | `"站点信息"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.content` | string | `"博客内容"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.more` | string | `"更多链接"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.topLinks` | string | `"站点导航"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.openSidebar` | string | `"打开侧栏"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.closeSidebar` | string | `"关闭侧栏"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.sidebar` | string | `"站点侧栏"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.skip` | string | `"跳到主要内容"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.email` | string | `"电子邮件"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.rss` | string | `"RSS 订阅"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.social` | string | `"联系与订阅"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.allFacet` | string | `"全部{label}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.browse` | string | `"文章浏览"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.facetDescription` | string | `"{title}相关的文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.categories` | string | `"分类"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.tags` | string | `"标签"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.navigation.archive` | string | `"归档"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.noCategories` | string | `"暂无分类"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.noTags` | string | `"暂无标签"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.noArchives` | string | `"暂无归档"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.categoriesTitle` | string | `"文章分类"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.tagsTitle` | string | `"所有标签"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.archiveTitle` | string | `"文章归档"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.noArticles` | string | `"暂无文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.example` | string | `"示例"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.pinned` | string | `"置顶"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.home.latest` | string | `"最新一篇"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.updates` | string | `"最近更新"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.friends` | string | `"友情链接"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.comments` | string | `"最近评论"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.content` | string | `"侧栏内容"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.appearance` | string | `"外观"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.noFriends` | string | `"暂无友链"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.friendsDescription` | string | `"友情链接与推荐站点"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.exampleComments` | string | `"示例留言"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.openComment` | string | `"打开文章，查看这条留言。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.openCommentPost` | string | `"点击阅读留言对应的文章。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.sidebar.noComments` | string | `"暂无评论"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.placeholder` | string | `"搜索文章…"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.clear` | string | `"清除搜索"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.title` | string | `"搜索结果"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.results` | string | `"“{query}” · 找到 {count} 篇文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.empty` | string | `"没有找到相关文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.suggestion` | string | `"请换个关键词，或清除搜索。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.allPosts` | string | `"查看全部文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.loadMore` | string | `"加载更多"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.retry` | string | `"重试加载"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.loading` | string | `"正在加载文章…"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.failed` | string | `"文章加载失败，请重试。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.search.pagination` | string | `"文章分页"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.breadcrumb` | string | `"返回导航"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.related` | string | `"相关文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.previous` | string | `"上一篇"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.next` | string | `"下一篇"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.noPrevious` | string | `"没有上一篇"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.noNext` | string | `"没有下一篇"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.neighbors` | string | `"相邻文章"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.discuss` | string | `"参与讨论"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.minutes` | string | `"约 {count} 分钟"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.updated` | string | `"更新于"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.toc` | string | `"文章目录"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.tocTitle` | string | `"本文目录"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.tocSummary` | string | `"文章目录 · {count} 个章节"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.tocCollapsed` | string | `"折叠文章目录"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.auxiliary` | string | `"阅读辅助"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.anchor` | string | `"定位到：{title}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.copy` | string | `"复制"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.copied` | string | `"已复制"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.copySuccess` | string | `"代码已复制"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.copyFailed` | string | `"复制失败，请手动选择代码。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.copyLabel` | string | `"复制 {language} 代码"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.codeRegion` | string | `"{language} 代码，可横向滚动"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.table` | string | `"文章表格"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.tableRegion` | string | `"{title}，可横向滚动"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.missingImage` | string | `"图片暂时无法显示{detail}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.missingPage` | string | `"页面未找到"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.missingDescription` | string | `"链接可能已失效，请返回文章列表。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.reading.moved` | string | `"文章链接已迁移"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.theme.light` | string | `"浅色"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.theme.dark` | string | `"深色"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.theme.auto` | string | `"跟随系统"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.theme.label` | string | `"主题：{mode}，点击切换为{next}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.theme.title` | string | `"当前{mode}，点击切换为{next}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.title` | string | `"评论"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.frameTitle` | string | `"文章评论"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.idle` | string | `"滚动至此加载评论。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.loading` | string | `"正在加载评论…"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.failed` | string | `"评论暂时无法加载。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.retry` | string | `"重新加载评论"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.noScript` | string | `"评论由独立服务提供，需要启用 JavaScript。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.count` | string | `"{count} 条"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.recentIdle` | string | `"打开此页签加载留言。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.recentLoading` | string | `"正在加载留言…"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.recentUnavailable` | string | `"此评论服务不提供最新评论。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.recentReady` | string | `"最近的留言"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.recentEmpty` | string | `"暂时没有可显示的留言。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.recentFailed` | string | `"留言暂时无法加载。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.recentRetry` | string | `"重试加载留言"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.runtimeFailed` | string | `"评论模块未能加载，请刷新后重试。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.reload` | string | `"刷新后重试"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.comments.guest` | string | `"访客"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.title` | string | `"图片查看器"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.zoom` | string | `"缩放"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.previous` | string | `"上一张"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.next` | string | `"下一张"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.error` | string | `"图片无法加载，可关闭后查看其他图片。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.original` | string | `"查看原图"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.enlarge` | string | `"放大图片：{title}"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.image` | string | `"正文图片"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.lightbox.failed` | string | `"图片查看器无法加载，请重试。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.note` | string | `"提示"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.info` | string | `"信息"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.success` | string | `"成功"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.warning` | string | `"注意"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.danger` | string | `"警告"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.details` | string | `"详细内容"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.gallery` | string | `"文章图片组"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.tabs` | string | `"内容选项"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.mathRegion` | string | `"数学公式，可横向滚动"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.diagramRegion` | string | `"Mermaid 图表，可滚动"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.diagramIdle` | string | `"图表将在进入阅读区域时加载，源码始终可查看。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.diagramLoading` | string | `"正在渲染图表…"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.diagramFailed` | string | `"图表渲染失败，可查看下方源码。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.diagramModuleFailed` | string | `"图表模块无法加载，可查看源码。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.diagramRetry` | string | `"重试渲染"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.diagramSource` | string | `"图表源码"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.video` | string | `"{provider} 视频"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.videoPrivacy` | string | `"播放器仅在点击后连接 {provider}。"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.videoLoad` | string | `"加载 {provider} 视频"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.videoOpen` | string | `"在 {provider} 打开"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.videoClose` | string | `"关闭播放器"` | 长度 ≥ 1，长度 ≤ 500 |
| `ui.markdown.videoFailed` | string | `"播放器无法加载，请通过原站链接打开。"` | 长度 ≥ 1，长度 ≤ 500 |
| `site.name` | string | `"Nekomi"` | 长度 ≥ 1，长度 ≤ 80 |
| `site.tagline` | string | `"分享技术、日常"` | 长度 ≤ 1000 |
| `site.intro` | string | `""` | 长度 ≤ 1000 |
| `site.avatar` | string | `""` | 长度 ≤ 2048 |
| `site.favicon` | string | `""` | 长度 ≤ 2048 |
| `site.appleTouchIcon` | string | `""` | 长度 ≤ 2048 |
| `site.avatarAlt` | string | `"站点头像"` | 长度 ≤ 1000 |
| `site.avatarFallback` | string | `"N"` | 长度 ≤ 2 |
| `site.email` | string / string | `""` | — |
| `site.social` | array | `[]` | — |
| `publishing.url` | string | `""` | — |
| `publishing.base` | string | `"/"` | — |
| `publishing.language` | string | `"zh-CN"` | — |
| `publishing.timeZone` | string | `"Asia/Shanghai"` | — |
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
| `appearance.webFonts` | array | `[]` | — |
| `appearance.semanticColors.success` | string | `"#357b54"` | — |
| `appearance.semanticColors.warning` | string | `"#946b00"` | — |
| `appearance.radius` | integer | `20` | ≥ 8，≤ 28 |
| `appearance.wallpaper.enabled` | boolean | `false` | — |
| `appearance.wallpaper.light` | string | `""` | 长度 ≤ 2048 |
| `appearance.wallpaper.dark` | string | `""` | 长度 ≤ 2048 |
| `appearance.wallpaper.mobileLight` | string | `""` | 长度 ≤ 2048 |
| `appearance.wallpaper.mobileDark` | string | `""` | 长度 ≤ 2048 |
| `appearance.wallpaper.position` | string | `"center"` | 长度 ≤ 80 |
| `appearance.wallpaper.fit` | `cover` / `contain` | `"cover"` | — |
| `appearance.wallpaper.lightOverlay` | number | `0.6` | ≥ 0，≤ 1 |
| `appearance.wallpaper.darkOverlay` | number | `0.68` | ≥ 0，≤ 1 |
| `appearance.wallpaper.lightSurface` | number | `0.84` | ≥ 0.65，≤ 1 |
| `appearance.wallpaper.darkSurface` | number | `0.88` | ≥ 0.65，≤ 1 |
| `appearance.wallpaper.lightReaderSurface` | number | `0.97` | ≥ 0.85，≤ 1 |
| `appearance.wallpaper.darkReaderSurface` | number | `0.97` | ≥ 0.85，≤ 1 |
| `appearance.wallpaper.cacheHours` | number | `24` | ≥ 0，≤ 168 |
| `appearance.decorations.sidebar.enabled` | boolean | `false` | — |
| `appearance.decorations.sidebar.light` | string | `""` | 长度 ≤ 2048 |
| `appearance.decorations.sidebar.dark` | string | `""` | 长度 ≤ 2048 |
| `appearance.decorations.sidebar.width` | integer | `200` | ≥ 64，≤ 320 |
| `appearance.decorations.sidebar.opacity` | number | `0.85` | ≥ 0，≤ 1 |
| `appearance.decorations.sidebar.offsetX` | integer | `0` | ≥ -64，≤ 64 |
| `appearance.decorations.sidebar.offsetY` | integer | `0` | ≥ -64，≤ 64 |
| `appearance.decorations.sidebar.align` | `right` / `center` | `"right"` | — |
| `appearance.decorations.sidebar.mobile` | boolean | `false` | — |
| `appearance.decorations.comments.enabled` | boolean | `false` | — |
| `appearance.decorations.comments.light` | string | `""` | 长度 ≤ 2048 |
| `appearance.decorations.comments.dark` | string | `""` | 长度 ≤ 2048 |
| `appearance.decorations.comments.width` | integer | `144` | ≥ 64，≤ 320 |
| `appearance.decorations.comments.opacity` | number | `0.85` | ≥ 0，≤ 1 |
| `appearance.decorations.comments.offsetX` | integer | `0` | ≥ -64，≤ 64 |
| `appearance.decorations.comments.offsetY` | integer | `0` | ≥ -64，≤ 64 |
| `appearance.decorations.comments.align` | `right` / `center` | `"right"` | — |
| `appearance.decorations.comments.mobile` | boolean | `false` | — |
| `layout.backToTop` | boolean | `true` | — |
| `layout.sidebarSections` | array / null | `null` | — |
| `layout.width` | integer | `1440` | ≥ 1360，≤ 1600 |
| `layout.readerWidth` | integer | `760` | ≥ 680，≤ 800 |
| `layout.sidebarWidth` | integer | `320` | ≥ 280，≤ 320 |
| `layout.recentPostsLimit` | integer | `5` | ≥ 0，≤ 12 |
| `layout.friendsPreviewLimit` | integer | `5` | ≥ 0，≤ 12 |
| `layout.modules` | array | `["profile","social","search","tabs"]` | — |
| `layout.sidebarTabs` | array | `["updates","friends","comments"]` | — |
| `scripts.global` | array | `[]` | — |
| `scripts.byPage` | array | `[]` | — |
| `navigation.pageTabs` | array | `[]` | — |
| `navigation.tabs` | array | `[{"id":"recent","label":"全部文章","enabled":true},{"id":"categories","label":"分类","enabled":true},{"id":"tags","label":"标签","enabled":true},{"id":"archive","label":"归档","enabled":true}]` | — |
| `navigation.links` | array | `[]` | — |
| `navigation.topLinks` | array | `[]` | — |
| `home.eyebrow` | string | `""` | 长度 ≤ 1000 |
| `home.description` | string | `""` | 长度 ≤ 1000 |
| `home.emptyTitle` | string | `"暂无文章"` | 长度 ≤ 1000 |
| `home.emptyDescription` | string | `""` | 长度 ≤ 1000 |
| `cards.example` | boolean | `true` | — |
| `cards.pinned` | boolean | `true` | — |
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
| `content.defaultCategory` | string | `"未分类"` | 长度 ≥ 1，长度 ≤ 100 |
| `content.categoryColors` | object | `{}` | — |
| `content.categoryPreviewLimit` | integer | `3` | ≥ 0，≤ 12 |
| `content.archivePreviewLimit` | integer | `3` | ≥ 0，≤ 12 |
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
| `comments.pageKeyPrefix` | string | `"/pages/"` | — |
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
- NEKOMI_CONFIG 指向一份完整用户配置（相对于主题默认值，不继承 site.config.json）；NEKOMI_CONTENT_DIR 指向文章 Markdown 目录，NEKOMI_PAGES_DIR 指向独立页面目录。两者可用于独立维护个人配置/文章。只使用受信任的 Markdown，支持原始 HTML，不将其作为不可信投稿接口。
