# 图片接入

可优化的本地图片优先放在 `src/assets/images/`，由 Astro 输出响应式 WebP 和固有尺寸；配置路径仍填写 `images/...`。`public/images/` 继续支持原样输出与缺失回退。`src/assets/images/demo-home.png` 是本项目原有界面截图，用于演示文章中的图片排版，不是默认壁纸或动漫素材。

- **站点头像**：在根目录 `site.config.json` 的 `site.avatar` 填 `images/avatar.webp`，同时填写 `avatarAlt`。保持无边框圆形，缺失或失败时显示 `avatarFallback`。
- **浏览器 / 设备图标**：主题内置正式 Favicon 与 Apple Touch Icon，省略或留空自动使用；`site.favicon` / `site.appleTouchIcon` 可单独覆盖。它们与站点头像无关，不参与头像优化。详见 [图标配置](CONFIGURATION-GUIDE.md#浏览器与设备图标)。
- **文章封面**：Markdown frontmatter 填 `cover: images/covers/example.webp` 与 `coverAlt`。宽卡片右图、窄卡片上图，阅读页标题后显示可选头图。缺失不占位，失败收起。建议至少 800px 的 WebP / AVIF。
- **正文图片**：`src/assets/images/` 下的图片可继续用原有的 `/images/...` 写法，插件将 Markdown 及 HTML figure 中的本地路径交给 Astro 原生图片流程，正文无需改写。标准 Markdown 的相对图片导入也可直接使用 Astro 的优化。Markdown 中用 `![图片说明](/images/example.webp)`；复杂排版可用 HTML figure，外部或 public 图片建议写自然 width / height 和 figcaption。图片失败保留说明。
- **壁纸**：壁纸仍须用运行时可访问的 `public/` 路径或 HTTP(S) 地址，不从 `src/assets/` 解析，也不进入构建期图片优化。配置 `appearance.wallpaper.light` / `dark` 为 `images/wallpapers/day.webp` 等。默认关闭且没有外部地址；原站 API 仅保留在 examples/personal 配置中；深色空值沿用浅色图。支持 position / fit、明暗遮罩、表面与缓存时长。
- **友链 / 评论头像**：配置中填 `images/friends/example.webp`，无图或坏图回退名称首字。

配置图片路径相对于站点根目录，可填写 HTTP(S) 外链；本地建议使用 `images/...`，会自动适配 `SITE_BASE`。不要把原项目的 `assets/images/` 路径直接照搬。仅使用有授权的素材，避免超大原图；主题不生成头像、插画或美术资源。

`SiteImage.astro` 共用 Avatar / 封面 / 头图：Avatar 输出 1x / 2x 候选和固定尺寸，封面 / 头图输出 320 / 640 / 960 / 1440px 候选（不超出原图），结合 `sizes` 和既有 aspect-ratio 保持布局。正文图使用同级宽度候选，保留 width / height、caption 和懒加载。外部地址不在默认优化白名单，保留原地址且不在构建时抓取；头像尺寸与封面容器仍预留空间，外部正文应由作者给出自然尺寸。

随机 `nekopara.uk/pic_api` 始终由现有运行时图片加载器 / Service Worker 处理，不能放进 Astro Image 或远程图片白名单。内部导航保留相同壁纸 DOM、图像与加载任务。所有图片保留失败回退：头像文字、封面 / 头图收起、正文说明。

## 正文灯箱（P3.1）

正文 `![替代文字](images/photo.webp "说明")` 中的 images/ 对应 src/assets/images/；Astro 保留响应式优化、srcset 与宽高，灯箱使用原始本地资产。src/ 之外的相对文章资源由公开 getImage API 额外输出同格式的全分辨率版本。public/ 与外部图片仍使用其原地址，不在构建时抓取随机资源。

`reading.lightbox` 可全站或单篇关闭。普通链接中的图片不被接管，损坏图片保留回退；库和 CSS 仅首次打开图片时下载，离页清理。图片组及键盘 / 触控操作见 [Markdown 写作文档](MARKDOWN.md)。壁纸与头像不是正文图片，不加入灯箱。
