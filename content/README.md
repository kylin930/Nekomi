# 演示文章约定

全部文章、日期与叙事均为演示，不代表站长真实经历。技术长文 `css-grid-two-column-blog` 和虚构随笔 `weekend-walk-by-river` 是主要排版样本，其他八篇让现有索引中的每个链接都有完整正文。

- `assets/js/data.js` 保存索引元数据：唯一、稳定的 `id`，`title`、`excerpt`、ISO `date`、`category`、`tags`，可选 `cover` / `coverAlt`，必需 `content`。
- `content` 指向本站 `content/posts/` 内的 UTF-8 HTML 片段。正文不重复 h1、日期、页头、导航或脚本，从 h2 开始划分章节。显式标题 `id` 可保证长期链接稳定；缺省时阅读脚本生成唯一中文 slug。
- 链接使用真实相对路径。片段中的图片 URL 相对于 `article.html`，建议填写 `alt` 和自然 `width` / `height`，避免加载后影响锚点位置。没有封面时不输出空框；封面加载失败会收起；正文图片失败保留文字提示。
- 代码用 `<pre><code class="language-css">…</code></pre>`，HTML 字符需转义。页面自动补语言、复制和滚动区域。表格保留 `caption`、`th` 和 `scope`，页面补滚动包装。
- 当前内容来自仓库内可信作者。阅读器仍限制元素、属性、URL 协议并删除脚本与事件处理器；这不是面向用户投稿的 HTML 清洗服务。

演示路由为 `article.html?post=<id>#<heading-id>`，使用普通文档导航，可刷新、收藏、分享，浏览器历史由原生链接与片段锚点维护。无效 ID 提示返回列表，正文请求失败可重试。需要 HTTP 服务，不支持直接用 `file://` 打开。

迁移到 Astro、Hugo 等工具时，保留元数据字段与语义正文结构，让生成器输出当前 `.reader` / `.prose` 内容即可。首页索引可由同一份元数据生成；路由函数集中在 `site.js`，不依赖客户端路由器，也没有引入 Markdown 解析器或构建系统。
