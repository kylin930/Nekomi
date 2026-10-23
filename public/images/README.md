# 图片接入

图片放在 `public/images/`，构建后原样输出，不依赖外链素材。`demo-home.png` 是本项目原有界面截图，用于演示文章中的图片排版，不是默认壁纸或动漫素材。

- **站点头像**：在根目录 `site.config.json` 的 `site.avatar` 填 `images/avatar.webp`，同时填写 `avatarAlt`。保持无边框圆形，缺失或失败时显示 `avatarFallback`。
- **文章封面**：Markdown frontmatter 填 `cover: images/covers/example.webp` 与 `coverAlt`。宽卡片右图、窄卡片上图，阅读页标题后显示可选头图。缺失不占位，失败收起。建议至少 800px 的 WebP / AVIF。
- **正文图片**：Markdown 中用 `![图片说明](/images/example.webp)`；复杂排版可用 HTML figure，建议写自然 width / height 和 figcaption。图片失败保留说明。
- **壁纸**：配置 `appearance.wallpaper.light` / `dark` 为 `images/wallpapers/day.webp` 等。默认仍是站长 API；深色空值沿用浅色图。支持 position / fit、明暗遮罩、表面与缓存时长。
- **友链 / 评论头像**：配置中填 `images/friends/example.webp`，无图或坏图回退名称首字。

配置图片路径相对于站点根目录，可填写 HTTP(S) 外链；本地建议使用 `images/...`，会自动适配 `SITE_BASE`。不要把原项目的 `assets/images/` 路径直接照搬。仅使用有授权的素材，避免超大原图；主题不生成头像、插画或美术资源。
