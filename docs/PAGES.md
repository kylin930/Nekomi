# 编写独立 Markdown 页面

独立页面适合“关于”“项目”“留言”等内容，使用单独的 `pages` Content Collection。与文章共用 Markdown 扩展、Shiki、图片优化、公式、图表、灯箱、代码复制和阅读布局，不需要 MDX 或服务端。

[配置参考](CONFIGURATION.md) · [Markdown 语法](MARKDOWN.md) · [可运行组合示例](../examples/site-features.config.json)

## 创建页面

在 `src/content/pages/about.md` 中写入：

```md
---
title: 关于
description: 站点介绍与联系方式。
slug: about
comments: false
demo: false
---

## 关于这个站点

这里填写自己的介绍。

:::note[联系方式]
只填写打算公开的信息。
:::
```

构建后生成 `/about/`，可直接访问、刷新和分享。部署在 `/Nekomi/` 时为 `/Nekomi/about/`。Markdown 中使用 `/projects/` 等站内链接会自动补部署 base，不要重复写 base。

- `title` 必填；`description` 用于 SEO，省略时沿用站点描述。
- `slug` 可省略，默认使用文件的内容 ID；支持 `projects/tool` 这样的多级路径，不带前后斜杠。更改 slug 不改变文件 ID 或默认评论键。
- `draft` 默认 false，true 不生成 URL、面板或评论元数据。
- `comments` 默认 **false**，需要评论时显式开启，并配置全站服务。
- `cover / coverAlt` 是可选头图，与文章使用同样的图片规则。
- `reading` 可覆盖 `toc / copyCode / cover / lightbox / motion`；`markdown` 可覆盖 `math / mermaid / components`。不生成文章日期、分类、标签、阅读时间、相关文章或上下篇导航。
- `demo` 默认 false；仓库示例显式设为 true，继续 noindex。请在替换为自己的内容后再修改，不要将原示例当作真实内容索引。

独立页面不进入文章列表、分类、归档、文章搜索或 RSS。SEO、Canonical、分享封面及 Sitemap 遵循站点发布配置；可索引页面使用 `WebPage`，不会伪装成 `BlogPosting`。

## 路径与冲突

保留 `posts / page / friends / categories / tags / archive`、错误页、订阅 / Robots / Sitemap 及主题资源路径。保留前缀下的子路径也不允许，例如 `posts/about`。禁止空段、点段、查询、Hash、URL 或编码斜杠。重复 slug（包含大小写冲突）、与 src/pages 的同名静态路由或 public 输出冲突、启用不存在或草稿页面的导航时，构建会明确报错。

内置 `/friends/` 继续使用原配置和组件，不需要创建同名 Markdown。

## 加入首页主 Tabs

```json
{
  "navigation": {
    "pageTabs": [
      { "slug": "about", "label": "关于", "enabled": true },
      { "slug": "projects", "label": "项目", "enabled": false }
    ],
    "topLinks": [{ "label": "项目", "url": "/projects/" }]
  }
}
```

`pageTabs` 默认 `[]`，不改变原首页。配置后在四个内建内容 Tabs 后追加真正的 Markdown 内容面板，数组顺序决定页面 Tab 的顺序。原 `navigation.tabs` 继续管理内建四项，ID、搜索、Hash、位置恢复不变。

页面仍有独立 URL；面板的“独立打开”进入该 URL。`enabled:false` 只隐藏 Tab，不删除非草稿页面；也允许暂时禁用尚未创建的页面引用。无需 Tab 时只配置 `topLinks`、侧栏 `navigation.links` 或在 Markdown 中放普通链接。

内部 Tab ID 由 `page-` 加 slug 生成，与 recent / categories / tags / archive 不冲突；重复引用会报错。首页 Hash 例如 `#page-about`。正文标题和内容组件 ID 自动加页面命名空间，避免多个面板重复 ID；Markdown 内的 `#标题锚点`、目录和 ARIA 引用同步处理。分享正文位置请复制标题旁的锚点链接；自写样式 / 脚本建议使用 class 或 data 属性，不假定原始 HTML ID 保持不变。

面板切换保留正文 DOM，活动页面才绑定阅读交互和评论会话。无 JS 时通过真实的普通链接进入独立 URL。面板正文在构建时输出，因此建议只把较短的常用页面放进首页，长页面保留独立入口即可。

## 页面评论

```yaml
comments: true
commentId: about-me
```

页面默认键为 `comments.pageKeyPrefix + encodeURIComponent(commentId || 文件ID) + '/'`，默认 `/pages/`；文章仍沿用原 `comments.keyPrefix`（默认 `/posts/`）。标题、域名、base 和 slug 不参与身份计算。重命名文件时保留旧 `commentId`；迁移既有讨论可使用 `commentPath`。启用页面与文章的评论键冲突时构建报错，Twikoo 仍要求 path 而非完整域名。

评论直接使用通用 `CommentContent` 身份，并非补齐日期 / 分类来伪造文章。适配器原 `context.post`、查询 `posts` 名称为兼容保留，现在可以包含 `kind:'page'` 的内容；挂载上下文也提供 `content` 别名。Waline / Twikoo / Artalk 等继续接收稳定键和实际页面 URL；最新留言可以链接到页面，仅具备 locate 能力时追加具体锚点。

独立页和首页面板每次只有活动阅读区挂载评论，切换或离开时取消请求并销毁实例。`provider:link` 需同时填写页面 `comments:true` 与 `commentsUrl`。[评论服务说明](COMMENTS.md)。[留言页示例](../examples/pages/message.md)可复制到内容目录后启用。

## 分离个人内容

默认目录是 `src/content/pages/`；可以用 `NEKOMI_PAGES_DIR=/path/to/pages` 指向其他目录。它与文章的 `NEKOMI_CONTENT_DIR` 分开。空目录或删除全部示例后仍可构建；同时移除或禁用指向这些页面的 pageTabs。
