# Nekomi 正式品牌资源

唯一原始设计为维护者提供的 `nekomi-icon.svg`，原样保存于 [public/favicon.svg](../public/favicon.svg)。路径、配色、构图、圆角及文件内容均未改动，无外部图片、字体或脚本依赖。

原始 SVG 的 SHA-256：`ff1f48cd17f0812baa7ae3651ab25b05e0c4ededd966c9625442ab5c99a87ef3`。

| 文件 | 用途 |
| --- | --- |
| [public/favicon.svg](../public/favicon.svg) | 正式 Logo 与默认现代浏览器 Favicon；官网也应直接复用此文件 |
| [public/apple-touch-icon.png](../public/apple-touch-icon.png) | 从 SVG 转换的 180×180 透明 PNG，默认用于 Apple 主屏幕图标 |
| [public/favicon.ico](../public/favicon.ico) | 同一 SVG 转换的 16 / 32 / 48px ICO 兼容资源；包含 PNG 图像条目，供支持该格式的浏览器使用 |
| [docs/brand/github-social-preview.png](brand/github-social-preview.png) | 仓库社交预览 PNG，1280×640；仅在白色画布居中显示原图，没有新增文字或装饰 |

默认页面只声明一个 SVG Favicon，不同时声明 ICO，避免多图标竞争或额外下载；需要 ICO 的使用者可设 `site.favicon: "/favicon.ico"`。所有栅格资源均由同一 SVG 生成，未引入其他图案。重新生成：

```sh
npm ci
node scripts/brand-assets.mjs
```

转换脚本使用 Astro 已安装的 Sharp，仅供资源维护，不加入客户端包，也不在每次构建时执行。不要直接编辑派生 PNG / ICO，修改正式资源时应以 SVG 为源重新转换。

## 默认图标与个人头像

不配置或留空图标字段时，主题直接引用内置资源，自动适配根路径与子路径部署。`site.favicon`、`site.appleTouchIcon` 分别覆盖浏览器 / Apple 图标；`site.avatar` 始终独立，不会被 Logo 替换。详见 [图标配置](CONFIGURATION-GUIDE.md#浏览器与设备图标)。

## GitHub 仓库 About

在仓库首页右侧 **About → 齿轮** 中可以填写描述、Website 和 Topics。建议使用以下内容：

- **描述**：基于 Astro、MDUI 2 与 Material Design 3 的开源静态博客主题，支持 Markdown 写作、独立页面与自定义配置。
- **Website / Homepage**：官网尚未确认上线地址，保持留空；上线后再填写实际地址。
- **Topics**：`astro`、`astro-theme`、`blog-theme`、`markdown`、`mdui`、`material-design-3`、`static-site`、`typescript`。

2026-10-28 检查时上述设置为空；通过当前接入凭据修改描述和 Topics 均返回 `403 Resource not accessible by integration`，因此这里只提供建议，未声称设置已完成。用户名和提交邮箱只标记代码作者，不授予这些设置的修改权限。

## GitHub Social Preview

图片已生成，**尚未上传或设置为 GitHub Social Preview**。仓库维护者可在 **Settings → General → Social preview → Edit → Upload an image** 上传 [github-social-preview.png](brand/github-social-preview.png)。它仅供仓库展示，不会自动替换用户博客的 Open Graph 分享图。

2026-10-28 核查仍使用 GitHub 自动生成的预览，未启用自定义图片。当前可用的公开 API 没有此图片的上传字段，需要通过网页设置上传。

## 官网复用

本轮工作区仅包含 Nekomi 主题仓库，没有独立官网项目，因此未改动或创建官网。官网应复用本仓库的 `public/favicon.svg` 作为左上角 Logo 和 Favicon；Apple 图标复用 `public/apple-touch-icon.png`，Open Graph 生成流程也使用同一 SVG。建议将这两个文件同步到官网自己的公共资源目录，避免依赖 GitHub 原始文件外链。

## 验证

[浏览器浅深色图标对照](brand/browser-icons.png)展示同一 SVG 在 16 / 32 / 64px 和派生 Apple PNG 的实际渲染；没有调整主题页面设计。构建、覆盖与子路径验证见 [测试记录](../tests/RESULTS.md)。

本轮另外以浏览器 1× 像素比例检查 16 / 32 / 48 / 64px：32px 及以上猫脸与圆角构图清晰；16px 的嘴部细节会压缩，但紫色轮廓和白猫仍可辨认，暂不需要单独简化。正式 SVG 与派生资源均未修改；将来如需小尺寸专用版本，应另行确认设计。
