# 依赖与发布许可检查

由 `npm run licenses` 根据已安装锁定版本生成。主题代码 MIT 不改变第三方许可。浏览器 MDUI / Astro 及 MDUI 依赖的完整许可文本随静态产物一起发布在 `/THIRD-PARTY-LICENSES.txt`；目录为保守范围，可能包含本次按需组件未使用的依赖。图标字体由 Google Fonts 提供，另见 THIRD-PARTY-NOTICES.md。

| 直接依赖 | 锁定版本 | 许可 | 分工 |
| --- | --- | --- | --- |
| @astrojs/markdown-remark | 7.3.4 | MIT | 构建期，不加入浏览器依赖 |
| @astrojs/rss | 4.0.19 | MIT | 构建期，不加入浏览器依赖 |
| @astrojs/sitemap | 3.7.4 | MIT | 构建期，不加入浏览器依赖 |
| astro | 7.4.2 | MIT | 静态构建与浏览器导航运行时 |
| mdui | 2.1.5 | MIT | 浏览器组件与主题功能 |
| rehype-raw | 7.0.0 | MIT | 构建期，不加入浏览器依赖 |

## 构建工具的特殊许可

Astro 图片 / 构建依赖树含下列 LGPL / MPL 包（含可选平台二进制）。它们通过原 npm 包安装并保留各自许可，不复制进浏览器 JS；产物只含优化后的图片。不要把“主题 MIT”表述为整个 npm 依赖树全部 MIT。若重新分发构建工具或二进制，应遵守对应包的许可要求。

- @img/sharp-libvips-darwin-arm64 (LGPL-3.0-or-later)
- @img/sharp-libvips-darwin-x64 (LGPL-3.0-or-later)
- @img/sharp-libvips-linux-arm (LGPL-3.0-or-later)
- @img/sharp-libvips-linux-arm64 (LGPL-3.0-or-later)
- @img/sharp-libvips-linux-ppc64 (LGPL-3.0-or-later)
- @img/sharp-libvips-linux-riscv64 (LGPL-3.0-or-later)
- @img/sharp-libvips-linux-s390x (LGPL-3.0-or-later)
- @img/sharp-libvips-linux-x64 (LGPL-3.0-or-later)
- @img/sharp-libvips-linuxmusl-arm64 (LGPL-3.0-or-later)
- @img/sharp-libvips-linuxmusl-x64 (LGPL-3.0-or-later)
- @img/sharp-wasm32 (Apache-2.0 AND LGPL-3.0-or-later AND MIT)
- @img/sharp-win32-arm64 (Apache-2.0 AND LGPL-3.0-or-later)
- @img/sharp-win32-ia32 (Apache-2.0 AND LGPL-3.0-or-later)
- @img/sharp-win32-x64 (Apache-2.0 AND LGPL-3.0-or-later)
- lightningcss (MPL-2.0)
- lightningcss-android-arm64 (MPL-2.0)
- lightningcss-darwin-arm64 (MPL-2.0)
- lightningcss-darwin-x64 (MPL-2.0)
- lightningcss-freebsd-x64 (MPL-2.0)
- lightningcss-linux-arm-gnueabihf (MPL-2.0)
- lightningcss-linux-arm64-gnu (MPL-2.0)
- lightningcss-linux-arm64-musl (MPL-2.0)
- lightningcss-linux-x64-gnu (MPL-2.0)
- lightningcss-linux-x64-musl (MPL-2.0)
- lightningcss-win32-arm64-msvc (MPL-2.0)
- lightningcss-win32-x64-msvc (MPL-2.0)
