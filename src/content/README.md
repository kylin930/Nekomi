# 文章 Frontmatter

文章位于 src/content/posts/*.md，文件名为稳定 ID（/posts/<id>/）。schema 在 src/content.config.ts；正文由 Astro Content Collections / Markdown 在构建期渲染。

| 字段 | 类型 / 默认值 | 说明 |
| --- | --- | --- |
| title | string，必填 | 标题 |
| date | YYYY-MM-DD，必填 | 发布日期，建议加引号 |
| excerpt | string，可省略 | 摘要；缺省从正文提取，长度由 content.excerptLength 控制 |
| description | string，可省略 | 单篇 SEO 描述，缺省使用摘要 |
| author | string，可省略 | 单篇署名，缺省使用 publishing.author / 站名 |
| updated | YYYY-MM-DD，可省略 | 真实更新日期；不填写时不编造 |
| category | string / null，可省略 | 分类；缺省显示 content.defaultCategory，默认「未分类」 |
| tags | string[]，默认 [] | 标签 |
| pinned | boolean，默认 false | 列表置顶，再按发布日期排序；RSS 保持时间顺序 |
| draft | boolean，默认 false | 排除所有公开页面、搜索、导航和订阅 |
| cover / coverAlt | string，默认空 | 本地可优化图片或 HTTP(S) 地址及替代文字 |
| demo | boolean，默认 false | 示例文章必须 true：始终 noindex，不进入 RSS / Sitemap |
| comments | boolean，默认 true | 单篇关闭动态评论及其监听 / SDK |
| commentId | string，可省略 | 稳定线程 ID，重命名文件时保留旧值 |
| commentPath | 路径或 HTTP(S) URL，可省略 | 保留远程旧线程键；Twikoo 仅接受不含域名的路径 |
| commentsUrl | HTTP(S) URL，可省略 | comments.provider=link 时显示真实讨论入口 |
| reading | object，可省略 | toc/copyCode/cover/metadata/neighbors/motion/lightbox/readingTime/related 布尔开关，覆盖全站 reading |

| readingTime | boolean 或 1–10000 整数，可省略 | 单篇时长显示 / 指定分钟数，优先于 reading.readingTime；否则构建时估计 |
| markdown | object，可省略 | math/mermaid/components 布尔开关，覆盖全站 markdown |

```yaml
reading:
  toc: false
  copyCode: false
```

标题从 H2 开始；支持显式稳定锚点：`## 标题 {#stable-id}`。代码围栏注明语言，Shiki 生成浅深高亮。图片、表格和长代码不会撑宽手机页面。可用 Markdown 原始 HTML，因此仅编写 / 构建可信内容，不作为不可信投稿入口。

默认三篇入门 / Markdown 扩展示例，可全部删除。旧十篇示例移至 examples/demo-posts，`npm run dev:personal` / `build:personal` 可查看完整旧内容与壁纸能力而不覆盖当前文章。

动态评论身份与服务迁移见 [评论文档](../../docs/COMMENTS.md)，自建服务接口见 [开发说明](../../docs/COMMENT-ADAPTERS.md)。

[Markdown 扩展组件、公式、图表、灯箱与阅读时间](../../docs/MARKDOWN.md)提供完整可复制示例与安全说明。
