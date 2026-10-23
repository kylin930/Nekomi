# Markdown 文章约定

文章由 Astro Content Collections 在构建时读取，路径为 `src/content/posts/<id>.md`，文件名作为稳定 ID。输出 `/posts/<id>/index.html`，没有浏览器正文 fetch 或生产 Node 服务。十篇文章均为演示，不代表站长真实经历。

Frontmatter 必需 `title`、`excerpt`、ISO 日期字符串 `date`、`category`、`tags`；可选 `cover`、`coverAlt`、`demo`。JSON 或 YAML 均可，日期建议加引号。字段校验在 `src/content.config.ts`，新增文章会自动进入首页、归档、搜索、最近更新和上一篇 / 下一篇。

正文从段落或 h2 开始，不重复 h1 / 页头。普通 Markdown、围栏代码、GFM 表格都可使用；复杂表格可保留 `caption`、`th scope` 等 HTML。内容只接受仓库中可信作者，内嵌 HTML 会参与静态构建，不提供用户投稿清洗或执行沙箱。

- `## 标题 {#stable-id}` 保留显式锚点，省略时由 Astro 生成 slug。已有标题 ID 不随迁移变化。正文 h2–h6 自动生成层级目录。
- 使用 `/posts/another-id/` 与 `#stable-id` 链接；站内根路径由插件加上构建 `SITE_BASE`。不要自行重复添加 `/Nekomi/` 前缀。
- 可优化图片放 `src/assets/images/`（配置仍用 `images/...`），`public/images/` 保留原样资源支持，正文可用 `![说明](/images/example.webp)`。建议提供自然尺寸避免布局位移；原示例的 figure / figcaption 继续保留。Markdown 和 HTML figure 的本地图片均交给 Astro 图片流程生成 WebP / srcset / 固有尺寸；标准相对 Markdown 图片也可用。外部图片不在构建时抓取，作者应给出尺寸。两种写法均支持子路径部署，随机壁纸除外。
- 代码围栏注明语言；Astro Shiki 在构建时生成明暗语法高亮，之后自动补一层原生复制按钮、语言标签和横向滚动，不改变代码文本。长表格和代码不撑宽正文。
- 头图由 `cover` 指定，无图不渲染空框，坏图回退由共享运行时处理。

原 HTML 正文已迁移并删除。测试基线 `tests/fixtures/content-baseline.json` 保存迁移前各篇可见文本摘要、标题 ID 和完整代码，避免迁移丢失内容；新文章无需添加这份历史迁移基线。
