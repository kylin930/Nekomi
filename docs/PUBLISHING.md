# 发布、索引与文章浏览

部署操作：[GitHub Pages](../README.md#github-pages) · [Cloudflare Pages](../README.md#cloudflare-pages)。本文说明发布前的域名、子路径、SEO 和订阅设置；日常修改站点外观见 [简明配置指南](CONFIGURATION-GUIDE.md)，字段查询见 [完整配置参考](CONFIGURATION.md)。

## 先配置站点地址与内容性质

默认配置仍是主题预览：`demo: true`、`publishing.indexing: false`，没有假定正式域名。标题、摘要和分享文案始终生成；没有站点地址时省略 Canonical / `og:url`，不输出虚构的分享图片。RSS 保留有效的空订阅源，Sitemap 不生成，robots 不引用不存在的文件。构建时 sitemap 集成提示没有可收录页面是预期行为。

发布真实文章时：

1. 用自己的文章、日期、名称替换默认数据；真实文章的 `demo` 设为 `false`。
2. 将站点配置中的 `demo` 设为 `false`，`publishing.indexing` 设为 `true`。
3. 配置 `publishing.url`（HTTP(S) **源站地址**）和 `publishing.base`（路径），再构建。

```json
{
  "demo": false,
  "publishing": {
    "url": "https://blog.example.com",
    "base": "/",
    "language": "zh-CN",
    "indexing": true,
    "pageSize": 6,
    "author": "你的署名",
    "authorUrl": "",
    "socialImage": ""
  }
}
```

以上是配置示例，不表示 Nekomi 已部署到该地址。`SITE_URL` / `SITE_BASE` 优先于 JSON 中的地址 / 路径：

```sh
SITE_URL=https://blog.example.com SITE_BASE=/ npm run build
SITE_URL=https://username.github.io SITE_BASE=/Nekomi/ npm run build
```

不要把 `/Nekomi/` 同时写入 `SITE_URL`，它单独由 `SITE_BASE` 管理。根路径、文章、静态分页、分类 / 标签 / 月份、优化图片、Canonical、OG、RSS 和 Sitemap 共用这一组设置。`publishing.pageSize` 为 2–24 的整数，默认 6。作者为空时沿用站点名称；不生成作者履历、头像或邮箱。

## SEO 生成规则

`Seo.astro` 统一输出 Title / Description、Canonical、Open Graph、X Card、语言和 JSON-LD。查询参数和 Hash 不形成新的 Canonical；每个实际静态分页有自己的 Canonical，不全部指向首页。

- 配置 `cover` 的文章优先用封面分享；否则使用显式配置的 `socialImage`。本地资产通过 Astro 优化，公开目录中的文件检查存在后才输出。均为空时使用无图片的 `summary` Card，不拼接默认图片地址。
- `updated: "2026-10-23"` 是可选的真实修改日期。不填写就不输出 `dateModified` / `article:modified_time` / Sitemap lastmod，也不用构建时间冒充文章修改时间。
- 站点输出 `WebSite` / `Blog`。只有发布配置开启、且文章 `demo: false` 时才生成 `BlogPosting`；演示文章保留 `noindex, follow`，不作为站长的真实发表记录进入结构化数据。文章顶部不再显示示例标签；这仅是 UI 调整，不影响 demo 字段或上述规则。
- 官方 `@astrojs/sitemap` 根据最终静态 HTML 的 robots 元数据筛选页面，避免另一套索引名单；某张分页全部为示例时也 noindex，不会因其他分页有真实文章而被收录。lastmod 仅来自明确填写的修改日期。
- 官方 `@astrojs/rss` 只收录可索引的真实文章。站点预览 / 关闭索引 / 演示文章与 RSS、Sitemap 策略一致。侧栏 social 模块（含移动端 Drawer）与 head 提供订阅入口，默认页脚不重复显示。
- robots 允许爬取以便读取 `noindex`，只在 Sitemap 实际可生成时引用它；不会通过 `Disallow: /` 阻止搜索引擎看到 noindex。

**子路径托管注意**：产物中的 robots 位于 `/Nekomi/robots.txt`，而搜索引擎按域名根目录读取 `/robots.txt`。有根站点管理权限时，应合并规则并把正确的 Sitemap 地址放入域名根 robots；GitHub Pages 项目仓库不能替用户修改域名根站点。

## 静态分页与内容发现

首页及 `/page/2/`、`/page/3/`…由 Astro 构建分页，源码只包含当前一批 Card。每页都有真实的上一页 / 下一页锚点；关闭 JavaScript 仍能遍历全部文章，不依赖自动加载或 SPA fallback。

- 开启 JavaScript 后，在接近底部 360px 时由 IntersectionObserver 读取下一张静态分页，追加其中的同一套 Card；不预先下载全部分页。
- 没有 IntersectionObserver 时仍可点击原生 Button 加载或使用普通分页。失败停止自动重试，显示明确的“重试加载”；成功后接续原批次，不重排旧卡片。
- 单个加载任务、取消信号与查询序号防止重复追加和过期响应。手动加载后焦点到新文章标题，使用 `preventScroll`；加载区不参与滚动锚定，追加不会把视口拖到底部。
- 搜索查完整文章元数据（标题、摘要、分类、标签），不是只查当前 DOM。只读取下一批匹配结果所需的分页；输入立即更新计数，缺失卡片的网络请求合并 120ms。取消或离页后不会追加旧结果。
- `/categories/`、`/tags/`、`/archive/` 是独立索引页；例如 `/categories/前端/`、`/tags/javascript/`、`/archive/2026-10/` 为独立列表，超过每页数量时继续静态分页。复用原 Card、布局、侧栏与 ClientRouter。无脚本时 Tabs / Chip 的普通链接替代入口仍可访问。
- 原 `#recent` / `#categories` / `#tags` / `#archive` 保持兼容，主导航标签默认“全部文章”，侧栏默认“最近更新”；名称分别由 `navigation.tabs` 与 `ui.sidebar` 配置。Tabs 保留原生指示器和半透明 Surface，仅上方两角为圆角。分类和月份预览分别由 `content.categoryPreviewLimit`、`content.archivePreviewLimit` 控制，默认各三篇，设 0 隐藏预览；其余由“查看全部”进入静态分页。

## 返回列表与生命周期

`list-state.js` 只补充列表内容状态，**不替代 Astro 路由或滚动恢复**。离开列表保存当前面板、搜索条件、已加载的 Card 与下一页地址；遍历历史时，在 Astro Swap 前还原它们。MDUI 的插槽异步渲染，所以临时保留原 main 高度，组件完成更新后移除，防止 Astro 原生恢复坐标时被短页面截断为 0。

真实从本站列表进入文章时，历史记录携带来源与返回步数；相邻文章和章节 Hash 继续累计这段历史。文章“返回文章列表”通过原生历史遍历回到那个列表，保留前进记录。直接打开文章、来源已过期或来源不可验证时，使用普通首页链接，不盲目后退到外站。

缓存仅在当前窗口使用，最多八份列表；sessionStorage 辅助保存不超过约 1.8MB，拒绝存储时继续使用内存。内容 / 配置版本变化会使旧缓存失效。壁纸、侧栏、Drawer、主题和 MDUI 注册仍沿用 P2.3 的原位持久化外壳。异步请求、IntersectionObserver、计时器、页面监听随 AbortController 清理；新增卡片的 hover Prefetch 调用 Astro 原生去重 API，标题 / 封面共享过渡也支持分页及分类列表。

## 官方资料与测试

- [Astro 构建分页](https://docs.astro.build/en/guides/routing/#pagination)
- [ClientRouter 与生命周期](https://docs.astro.build/en/guides/view-transitions/)
- [官方 Sitemap 集成](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- [官方 RSS / Content Collections](https://docs.astro.build/en/recipes/rss/)

`tests/browse_audit.py` 在临时 Content Collection 中添加 32 篇测试文章，与原十篇合成 42 篇；其中非 demo 标记只用于验证发布规则，不进入仓库正式文章。验证七页、关闭 JavaScript、慢网 / 失败 / 取消 / 重复请求、精确返回与首帧、全量搜索、分享元数据、索引策略和根 / 子路径。原 P0–P2.3 回归继续覆盖组件、排版、Shiki、图片、动效与壁纸。
