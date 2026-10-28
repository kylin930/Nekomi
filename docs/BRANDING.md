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

## 验证

[浏览器浅深色图标对照](brand/browser-icons.png)展示同一 SVG 在 16 / 32 / 64px 和派生 Apple PNG 的实际渲染；没有调整主题页面设计。构建、覆盖与子路径验证见 [测试记录](../tests/RESULTS.md)。

本轮另外以浏览器 1× 像素比例检查 16 / 32 / 48 / 64px：32px 及以上猫脸与圆角构图清晰；16px 的嘴部细节会压缩，但紫色轮廓和白猫仍可辨认，暂不需要单独简化。正式 SVG 与派生资源均未修改；将来如需小尺寸专用版本，应另行确认设计。
