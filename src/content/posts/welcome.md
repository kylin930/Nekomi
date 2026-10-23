---
title: 欢迎使用 Nekomi
excerpt: 从一份配置和一篇 Markdown 开始，建立自己的博客。
date: '2026-01-02'
category: 开始使用
tags: [Nekomi, 写作]
demo: true
pinned: true
---

> 这是一篇入门示例，不代表站长的真实经历。示例文章不会进入 Sitemap 和 RSS，也不会被搜索引擎索引。开始写作后可以删除它。

## 先让这里像你 {#make-it-yours}

打开根目录的 `site.config.json`，修改名称、介绍和头像。没有头像也没关系，侧栏会显示你设置的文字。

```json
{
  "site": {
    "name": "我的小窝",
    "tagline": "分享技术、日常",
    "avatarFallback": "我"
  },
  "appearance": { "preset": "fresh" }
}
```

预设决定起点，仍可以在它的基础上覆盖主色、字体和圆角。默认没有壁纸，不会请求第三方随机图片服务。

## 写下第一篇 {#first-post}

在 `src/content/posts/` 新建一个 Markdown 文件。文件名决定文章 URL，例如 `hello.md` 对应 `/posts/hello/`。

```yaml
---
title: 你好，世界
date: '2026-01-03'
category: 随笔
tags: [生活]
demo: false
---
```

在 Frontmatter 之后写正文即可。摘要可以手动填写 `excerpt`，也可以让主题从正文生成。写作中的文章设为 `draft: true`，构建时会被排除。

### 放一张图片 {#images}

自己的图片可以放在 `src/assets/images/`，通过 Markdown 相对路径引入。Astro 会在构建时生成适合网页的图片。远程图片不会成为主题默认素材，请确认你有权使用。

### 检查发布设置 {#publish}

确认自己的正式站点地址后，再配置 `publishing.url` 并开启索引。根目录 `demo: false` 和文章的 `demo: false` 都是有意的发布步骤。

## 换成自己的内容 {#next}

1. 修改配置，预览浅色和深色。
2. 写文章，检查手机排版。
3. 删除入门示例，保留自己的 Markdown。
4. 按 README 部署静态构建产物。

Nekomi 不需要常驻的 Node.js 服务。构建完成后，`dist/` 就是可以部署的站点。
