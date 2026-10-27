# 简明配置指南

这里按常见需求介绍如何修改 `site.config.json`。不需要改 Astro 组件或 CSS。全部字段、类型和范围只在自动生成的 [完整配置参考](CONFIGURATION.md) 中维护；[完整默认配置](../examples/full.config.json)可供对照，不必全部复制。

[返回 README](../README.md) · [写作指南](MARKDOWN.md) · [评论接入](COMMENTS.md) · [部署指南](PUBLISHING.md)

## 目录

- [编辑配置与默认值](#编辑配置与默认值)
- [站点名称与头像](#站点名称与头像)
- [主题色与预设](#主题色与预设)
- [背景壁纸](#背景壁纸)
- [分类颜色](#分类颜色)
- [侧栏模块与名称](#侧栏模块与名称)
- [返回顶部按钮](#返回顶部按钮)
- [独立页面、侧栏常驻与自定义脚本](#独立页面侧栏常驻与自定义脚本)
- [顶部导航链接](#顶部导航链接)
- [页脚与版权](#页脚与版权)
- [接入评论](#接入评论)
- [保存、检查与发布](#保存检查与发布)

## 编辑配置与默认值

编辑仓库根目录的 `site.config.json`，保留 `"$schema": "./site.schema.json"`，支持 JSON Schema 的编辑器就能提示字段和取值。以下每段示例都是语法完整的 JSON 对象，可以作为一份配置使用。从 `examples/` 复制整份文件到根目录时，也要将其中的 `$schema` 路径改为 `./site.schema.json`。

已有配置时，把示例中的字段合并到现有的同名对象中。例如已经有 `appearance.color`，再添加壁纸时，应将 `wallpaper` 放在同一个 `appearance` 对象内；不要拼接多个根对象，也不要重复写 `appearance`。标准 JSON 不支持注释和尾随逗号。

- **省略字段使用默认值**：嵌套对象逐字段补全；只写 `appearance.wallpaper.enabled` 不会丢失默认的遮罩等设置。
- **数组整体替换**：`layout.modules`、`site.social`、`navigation.tabs`、`footer.links` 等不会按位置合并。调整顺序时写出想保留的全部项；`[]` 表示空列表。
- **显式值优先**：选择预设后，自己写的配色、字体和圆角会覆盖预设对应值。想恢复默认值，应删除对应字段；`false` 是关闭，`""` 是空字符串，不等于“恢复默认”。是否允许留空取决于字段，不要用 `null` 代替省略。

示例中的图片路径和服务地址需要换成自己的资源。缺省评论、壁纸和角色装饰均关闭。使用 `NEKOMI_CONFIG` 指向其他配置文件时，该文件继承主题默认值，**不叠加**仓库根配置；维护个人文件的方法见 [升级与保留个人配置](../README.md#从-p24-迁移与保留个人配置)。

## 站点名称与头像

```json
{
  "$schema": "./site.schema.json",
  "site": {
    "name": "山间笔记",
    "tagline": "技术笔记与日常",
    "intro": "记录开发中遇到的问题。",
    "avatar": "images/avatar.webp",
    "avatarAlt": "站点头像",
    "avatarFallback": "山"
  },
  "publishing": {
    "author": "你的署名"
  }
}
```

将头像放入 `src/assets/images/avatar.webp`，填写 `images/avatar.webp`，可使用 Astro 图片优化。也可放在 `public/images/avatar.webp` 并填写 `/images/avatar.webp`，或使用公开的 HTTPS 图片地址。无头像时将 `avatar` 设为 `""`，使用 `avatarFallback` 文字；图片加载失败也会回退。

`site.name` 同时用于默认页脚版权；`publishing.author` 用于发布元数据，留空时使用站名。社交链接、邮箱、Favicon 等见 [站点信息](CONFIGURATION.md#site)，更多图片路径规则见 [图片接入](IMAGES.md)。

## 主题色与预设

```json
{
  "appearance": {
    "preset": "fresh",
    "color": "#427f79",
    "mode": "auto"
  }
}
```

`preset` 支持 `default`、`fresh`、`minimal`。只切换预设时可省略 `color`；填写时使用六位 HEX 主色，MDUI 自动生成明暗配色。`mode` 支持 `auto`、`light`、`dark`，只决定首次默认模式，读者已保存的主题选择优先。

可通过 `appearance.font`、`headingFont`、`brandFont` 分别设置正文、文章标题和站名的字体栈。已有字体配置不会自动下载资源；需要本地 WOFF2 时见 [网页字体](PERSONALIZATION.md#本地网页字体)。

## 背景壁纸

```json
{
  "appearance": {
    "wallpaper": {
      "enabled": true,
      "light": "/images/wallpaper.webp",
      "dark": "",
      "lightOverlay": 0.60,
      "darkOverlay": 0.68
    }
  }
}
```

先将有权使用的图片放入 `public/images/wallpaper.webp`。壁纸使用 `public/` 路径或 HTTP(S) 地址，不使用 `src/assets/` 的优化路径；随机 API 在浏览器运行时请求，不会在构建时固定成一张图片。

`dark` 留空时复用浅色壁纸；`mobileLight`、`mobileDark` 可指定窄屏图片，未填沿用已有来源。遮罩数值越大，壁纸越淡；上面的数值就是默认遮罩。不需要壁纸时设置 `enabled: false`。角色装饰同样是可选项，见 [装饰配置](DECORATIONS.md)。

## 分类颜色

```json
{
  "content": {
    "defaultCategory": "其他",
    "categoryColors": {
      "技术": "primary",
      "旅行": "#b75d28",
      "摄影": "tertiary"
    }
  }
}
```

键名与文章 Frontmatter 的 `category` 精确对应，控制文章卡片的分类颜色。可选 `primary`、`secondary`、`tertiary`、`error`、`success`、`warning` 或六位 HEX；HEX 由 MDUI 生成适用于明暗模式的颜色组。未配置的分类统一使用 `primary`。

`defaultCategory` 改变未分类文章的显示文字，不改变相关文章的内部判断。分类预览数量、文案、语言和时区等进阶设置见 [个性化配置](PERSONALIZATION.md)。

## 侧栏模块与名称

```json
{
  "layout": {
    "modules": ["profile", "social", "search", "tabs"],
    "sidebarTabs": ["updates", "friends", "comments"],
    "recentPostsLimit": 5,
    "friendsPreviewLimit": 3
  },
  "ui": {
    "sidebar": {
      "updates": "最近文章",
      "friends": "友情链接",
      "comments": "最近留言"
    }
  }
}
```

`modules` 控制个人信息、社交链接、搜索、侧栏 Tabs 的顺序；从数组中删除某项即可隐藏。`sidebarTabs` 同理控制三个页签，不要修改内部 ID；显示名称由 `ui.sidebar` 设置。最近文章与友链预览数量可设为 0–12，设为 0 会隐藏对应页签。

最新评论只有配置的评论服务支持并启用查询时才出现。RSS 入口在 `social` 模块中，由 `features.rss` 控制，手机 Drawer 同样可见；移除 `social` 也会隐藏这个入口。更多侧栏设置见 [侧栏与布局](CONFIGURATION.md#layout)。

## 返回顶部按钮

默认启用全站返回顶部 FAB，使用 MDUI 原生组件。滚动超过 400px 后在右下角显示，点击后平滑回顶；减少动态设置下立即跳转。名称可以在现有文案表中覆盖：

```json
{
  "layout": { "backToTop": true },
  "ui": { "navigation": { "backToTop": "返回顶部" } }
}
```

不需要时将 `layout.backToTop` 设为 `false`，不渲染按钮或加载对应脚本。按钮避开移动端安全区域，Drawer、Dialog、提示条和图片灯箱打开时暂时隐藏；返回列表仍使用原有位置恢复，不修改 Hash 或浏览器历史。

## 独立页面、侧栏常驻与自定义脚本

在 `src/content/pages/` 写普通 Markdown，可生成 `/about/` 等独立 URL。`navigation.pageTabs` 可把它加入真正的首页内容面板；默认空数组不改变首页。[编写页面与评论](PAGES.md)。

`layout.sidebarSections` 可把 updates / friends / comments 设为 tab 或 standalone，并放在 Tabs 上下方。不填写时继续使用旧 sidebarTabs；全部常驻时不会出现空 Tab 栏。[侧栏配置示例](SIDEBAR.md)。

自有 JS 使用 `scripts.global / byPage`，支持 public/ 资源和可信 HTTPS；默认均为空，示例配置也关闭了挂件。需要按生命周期挂载和清理，不要靠重复 script 标签启动页面挂件。[接口与可复制代码](SCRIPTS.md)。

[完整组合示例](../examples/site-features.config.json)可直接作为 NEKOMI_CONFIG 使用，不覆盖根配置；其中关于进入 Tab、项目只保留普通链接、友链常驻在下方，并给出 HTTPS WOFF2 示例。最新评论在真正接入支持该能力的评论服务后才显示。

## 顶部导航链接

```json
{
  "navigation": {
    "topLinks": [
      { "label": "友链", "url": "/friends/" },
      { "label": "项目", "url": "https://github.com/kylin930/Nekomi", "newTab": true }
    ]
  }
}
```

这些是普通链接，与“全部文章 / 分类 / 标签 / 归档”内容 Tabs 分开。数组顺序决定显示顺序，单项可设 `enabled: false`；站内路径会自动补部署子路径。配置只创建入口，不生成新页面；“关于我”等链接应先有对应页面。

内容 Tabs 的名称与可见性使用 `navigation.tabs`；修改该数组时需保留启用的 `recent` 项。侧栏底部的普通链接使用 `navigation.links`。完整约束见 [导航](CONFIGURATION.md#navigation)。

## 页脚与版权

### 自动生成年份与站名

```json
{
  "site": { "name": "山间笔记" },
  "footer": {
    "enabled": true,
    "since": 2024,
    "copyright": "",
    "text": "",
    "links": []
  }
}
```

假设构建时站点所在时区为 2026 年，实际显示：

> © 2024–2026 山间笔记

`footer.enabled` 决定是否显示整个页脚。`footer.since` 是创站年份，默认 2026，允许 1970–2100 的整数；小于当前年份时显示年份范围，同年只显示一个年份。当前年份按 `publishing.timeZone` 在构建时计算，静态站跨年后需要重新构建。

`footer.copyright` 默认为空，自动生成 `© 年份 站名`；这里的站名来自 `site.name`。默认 `footer.text` 为空、`footer.links` 为 `[]`，因此默认站点在 2026 年只显示 `© 2026 Nekomi`。

### 自定义版权、补充说明与链接

```json
{
  "footer": {
    "copyright": "© 山间笔记",
    "text": "转载请注明出处",
    "links": [
      { "label": "Nekomi", "url": "https://github.com/kylin930/Nekomi" }
    ]
  }
}
```

实际显示：

> © 山间笔记 · 转载请注明出处 · [Nekomi](https://github.com/kylin930/Nekomi)

非空 `copyright` **完整替换**自动版权，此时 `since` 和站名不会再自动拼入版权文字，也不支持 `{year}` 等模板替换。`text` 在版权后以间隔点追加；`links` 按数组顺序追加为可点击链接，可用站内 `/` 路径、HTTP(S) 或 `mailto:` 地址。这些都是纯文本字段，不执行 HTML。

省略 `text` 或设为 `""` 就不显示补充说明；`links: []` 清空链接。RSS 默认在侧栏，不需要在页脚重复添加。

### 隐藏整个页脚

```json
{
  "footer": { "enabled": false }
}
```

版权、说明和链接都会隐藏，不产生页脚占位。只清空 `copyright` 会恢复自动版权，不能用于隐藏页脚。全部字段仍以 [完整配置参考](CONFIGURATION.md#footer) 为准。

## 接入评论

评论默认关闭。先按照所选服务的官方文档部署或配置独立服务，再填写公开连接参数。例如 Waline：

```json
{
  "comments": {
    "provider": "waline",
    "waline": { "serverURL": "https://comments.example.com" }
  }
}
```

示例地址是占位符，需要替换。关闭时将 `comments.provider` 设为 `none`，不加载评论 SDK；单篇文章可用 Frontmatter `comments: false` 禁用。其他内置服务及各自要求：[Twikoo](COMMENTS.md#twikoo)、[Giscus](COMMENTS.md#giscus)、[Artalk](COMMENTS.md#artalk)，自建服务见 [适配器开发](COMMENT-ADAPTERS.md)。

全套能力、稳定评论键和迁移规则见 [评论接入](COMMENTS.md)。前端配置会公开，不要填写 API 私钥或管理凭据。第三方评论组件内部语言由服务自己的 `lang` / `locale` 设置，不由主题文案表改写。

## 保存、检查与发布

保存后重新构建；开发服务器未反映配置时重启。可先运行：

```sh
npm run check
npm run build
npm run preview
```

构建会校验配置，错误信息包含具体字段路径。编辑器的 [JSON Schema](../site.schema.json) 提供补全，但不能代替构建时的跨字段检查。

首次发布前再设置真实域名、部署路径、`demo` 和索引开关；不要为移除界面提示而修改示例文章的 `demo: true`。操作步骤见 [发布与 SEO](PUBLISHING.md)，托管设置见 [GitHub Pages](../README.md#github-pages) / [Cloudflare Pages](../README.md#cloudflare-pages)。
