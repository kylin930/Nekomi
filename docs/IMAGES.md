# 图片接入

Nekomi 支持两种图片：放在 `src/assets/images/` 的图片会在构建时优化，放在 `public/images/` 的图片按原路径发布。配置中的路径统一相对站点根目录，主题会自动适配部署子路径。

## 快速选择

| 用途 | 推荐位置 | 配置写法 | 说明 |
| --- | --- | --- | --- |
| 站点头像 | `src/assets/images/avatar.webp` | `images/avatar.webp` | 同时填写 `site.avatarAlt`；无图或失败时使用 `avatarFallback` |
| 文章封面 | `src/assets/images/covers/example.webp` | `images/covers/example.webp` | 同时填写 `coverAlt`；建议至少 800px 的 WebP / AVIF |
| 正文图片 | `src/assets/images/photo.webp` | `images/photo.webp` | Astro 生成响应式图片与固有尺寸，支持灯箱 |
| 壁纸 | `public/images/wallpaper.webp` | `/images/wallpaper.webp` | 运行时加载，不参与构建期优化 |
| 友链 / 评论头像 | `public/images/friends/example.webp` | `/images/friends/example.webp` | 无图或坏图时回退名称首字 |
| Favicon / Apple 图标 | `public/icons/` | `/icons/my-icon.svg` | 省略或留空时使用主题内置图标 |

也可以使用公开的 HTTP(S) 图片地址。外链不会在构建时抓取或优化，可靠性与隐私取决于图片来源；重要资源建议自行托管。

## 路径规则

- `images/...` 对应 `src/assets/images/...`，由 Astro 优化。
- `/images/...` 对应 `public/images/...`，原样发布。
- 壁纸必须使用 `public/` 路径或 HTTP(S) 地址，不使用 `src/assets/` 的优化路径。
- 不要写 `public/` 前缀，也不要手动添加 `/Nekomi/` 等部署子路径。
- 仅使用有授权的素材，避免过大的原图。

## 头像

在 `site.config.json` 中填写：

```json
{
  "site": {
    "avatar": "images/avatar.webp",
    "avatarAlt": "站点头像",
    "avatarFallback": "林"
  }
}
```

头像保持无边框圆形。图片缺失或加载失败时显示 `avatarFallback` 文字。Favicon 与站点头像互相独立，主题不会用 Logo 替换头像。

## 封面与头图

在文章 Frontmatter 中填写：

```yaml
cover: images/covers/example.webp
coverAlt: 文章封面说明
```

宽卡片使用右侧封面，窄卡片改为上方封面，阅读页在标题后显示可选头图。没有封面时不占位，加载失败时收起。

## 正文图片与灯箱

```md
![图片说明](images/photo.webp "图片说明")
```

正文图片支持点击或 Enter / Space 打开灯箱：方向键切换、Esc 关闭、滚轮缩放、放大后拖动；触控支持滑动切图与双指缩放。带链接的图片保留原链接，不进入灯箱。

`reading.lightbox` 可以全站或单篇关闭。灯箱库和样式只在首次打开图片时下载，离开页面后清理。图片组、说明文字和键盘操作见 [Markdown 写作](MARKDOWN.md)。

## 壁纸

```json
{
  "appearance": {
    "wallpaper": {
      "enabled": true,
      "light": "/images/wallpaper.webp",
      "dark": "/images/wallpaper-dark.webp",
      "mobileLight": "/images/wallpaper-portrait.webp"
    }
  }
}
```

深色留空时复用浅色；移动端未配置时按 `mobileLight` → 浅色、`mobileDark` → 深色 → 浅色的顺序回退。壁纸支持位置、填充方式、明暗遮罩、表面透明度和缓存时长。

## 响应式与回退

- 头像输出 1x / 2x 候选和固定尺寸。
- 封面 / 头图输出 320 / 640 / 960 / 1440px 候选，不超出原图。
- 正文图片保留 `width` / `height`、说明文字和懒加载。
- 外链图片保留原地址，不在构建时抓取；作者应提供合适的自然尺寸。
- 所有图片都有失败回退：头像显示文字，封面收起，正文保留说明。

随机图片 API 只在浏览器运行时请求，不会在构建时固定成一张图。内部导航会保留同一壁纸 DOM、图像和加载任务。
