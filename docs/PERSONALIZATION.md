# 个性化配置：分类、文案、日期、导航与字体

第一次使用请先看 [简明配置指南](CONFIGURATION-GUIDE.md)，包括名称、头像、壁纸、侧栏、页脚版权和评论的可复制示例；本页说明进一步定制的方法。[返回 README](../README.md)。

修改 `site.config.json` 并重新构建。未填写的字段沿用中文默认值，旧配置继续可用。示例：[中文个人站](../examples/personalized.config.json)、[英文通用站](../examples/journal.config.json)、[完整默认配置](../examples/full.config.json)。完整类型和范围见 [配置参考](CONFIGURATION.md)。

## 分类名称与配色

```json
{
  "content": {
    "defaultCategory": "收件箱",
    "categoryColors": {
      "旅行": "#b75d28",
      "摄影": "tertiary",
      "资料": "secondary"
    },
    "categoryPreviewLimit": 2,
    "archivePreviewLimit": 1
  }
}
```

文章卡片的分类颜色按名称精确匹配，支持 `primary`、`secondary`、`tertiary`、`error`，以及 Nekomi 的 `success`、`warning` 语义角色；也可使用六位 HEX。HEX 会交给 MDUI 生成浅色、深色、容器及容器文字颜色，不会直接同时涂在两个模式上。相同 HEX 去重，最多配置 64 项。未配置一律使用 `primary`，没有针对「设计」「日常」「工程」的特殊规则。

原来自动选择粉色 / 蓝色的站点若希望延续效果，可显式配置 `"设计": "#b65e82"`、`"日常": "#427f9d"`。颜色现在属于用户配置，不再是组件内的名称映射。

`appearance.semanticColors.success / warning` 默认保持原色源，控制 Markdown 成功 / 注意提示，也可被上述分类角色复用。主色、辅助色仍使用已有 `appearance.color / secondary`。

`defaultCategory` 只决定显示文字。省略、YAML 空值、空白分类及旧文章的 `category: 未分类` 都具有内部空分类键，不会因为显示名称一样就互相推荐。显式填写其他分类名属于真实分类，即使它恰好与默认显示文字相同。相关文章仍可通过共同标签关联未分类文章。

分类 / 归档面板预览数为 0–12，默认各 3；设 0 不渲染预览列表，但保留标题、计数、静态页面链接和完整文章。侧栏数量继续使用已有 `layout.recentPostsLimit / friendsPreviewLimit`，最新评论使用已有 `comments.recentLimit`。分页大小仍由 `publishing.pageSize` 控制。

`cards.example / pinned` 默认 true，仅控制卡片角标。关闭它们不会修改文章 `demo / pinned`、索引保护或置顶排序。

## 界面文案与侧栏 Tabs

```json
{
  "ui": {
    "sidebar": {
      "updates": "更新笔记",
      "friends": "朋友们",
      "comments": "留言板"
    },
    "home": { "categoriesTitle": "按主题查看" },
    "search": {
      "placeholder": "找篇笔记…",
      "results": "查询 {query}：{count} 条记录"
    },
    "common": { "readMore": "打开文章" }
  }
}
```

`ui` 按 common、navigation、home、sidebar、search、reading、theme、comments、lightbox、markdown 分组。只写要覆盖的字段；编辑器可通过 JSON Schema 补全全部字段。字符串是纯文本，不执行 HTML。模板必须保留默认值中的 `{count}`、`{query}`、`{title}` 等占位符，缺失或多写会给出字段路径错误。

不要使用空白文案隐藏控件，应使用已有的功能、模块开关。主 Tabs 的名称仍由 `navigation.tabs[].label` 设置，站点身份、首页无文章状态、页脚分别继续使用 `site`、`home.emptyTitle / emptyDescription`、`footer`，没有另建重复配置。侧栏名称使用 `ui.sidebar`，顺序与启用状态继续由 `layout.sidebarTabs` 决定；内部 ID 不变。

文章、评论正文、作者自己写的指令标题不受 UI 表影响。Markdown 指令没有提供标题时才使用主题默认标题。SDK 内部文案仍由 Waline / Twikoo / Giscus 的 `lang`、Artalk 的 `locale` 等官方选项控制，Nekomi 不查找或改写其私有 DOM。

## 日期、语言与时区

```json
{
  "publishing": {
    "language": "zh-CN",
    "timeZone": "America/New_York"
  }
}
```

`language` 用于 HTML / SEO 语言声明、日期格式与搜索大小写转换，**不是自动界面翻译开关**。默认 UI 仍为中文，英文示例通过配置手动覆盖文案；不提供自动语言包、复数规则或 RTL 布局切换。

`timeZone` 默认 `Asia/Shanghai`，须为 Intl 支持的有效时区。评论时间和页脚年份按此时区显示。文章 `date / updated` 是 `YYYY-MM-DD` 日历日期，始终按原日期格式化，不转换时区：写 `2026-01-01` 不会在纽约显示成前一天。归档分组仍以原日期的年月生成稳定 URL，标题才按语言格式化。RSS、结构化数据等机器日期保留原 ISO 值。

修改默认分类显示名或真实分类名可能改变对应分类页的 slug；文章 URL 和内部 Tab Hash 不受影响。已有真实分类链接的重定向请按自己的部署方式保留。

## 普通顶部链接

```json
{
  "navigation": {
    "topLinks": [
      { "label": "友链", "url": "/friends/" },
      { "label": "项目", "url": "https://example.com/projects", "newTab": true },
      { "label": "暂时关闭", "url": "/about/", "enabled": false }
    ]
  }
}
```

链接在主内容顶部独立成行，默认空数组不占位；数组顺序就是显示顺序，`enabled` 默认 true，`newTab` 默认 false。内部内容 Tabs 保留原来的面板、指示器和 Hash，普通链接不会伪装成没有面板的 Tab，也不插入 Tab 的键盘导航序列。

站内 `/` 路径自动补部署 base，使用 ClientRouter，适度 hover Prefetch；外链正常跳转，新窗口使用安全 rel。无 JS 时仍有普通链接。此设置只创建入口，不创建页面；链接应指向已存在的静态页面。原来的 `navigation.links` 继续用于侧栏，两者互不替代。

## 本地网页字体

```json
{
  "appearance": {
    "webFonts": [
      { "family": "My Sans", "src": "/fonts/my-sans.woff2", "weight": "100 900", "preload": false }
    ],
    "brandFont": "\"My Sans\", system-ui, sans-serif"
  }
}
```

将有使用权限的 WOFF2 放入 `public/fonts/`。`family / src` 必填；`weight` 为 1–1000 或递增范围字符串，默认 `400`；`style` 为 normal / italic。最多六项，`font-display` 固定为 swap。没有内置新字体，默认数组为空。

定义字体不会强行覆盖现有字体栈，请在 `font / brandFont / headingFont` 中引用其 family，并保留系统字体回退。`preload` 默认关闭，仅必要的首屏字体建议开启；未使用的 family 不主动加载。外部 HTTPS WOFF2 须由来源服务器提供正确 CORS。加载失败时使用回退字体。第三方服务内部的字体仍受其官方样式和 iframe 边界限制。
