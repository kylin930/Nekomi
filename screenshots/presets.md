# 预设与配置截图

以下截图来自 Chromium 打开的生产静态产物，不是设计稿或生成图片。Default、Fresh、Minimal 没有外部壁纸；自定义配置使用项目自身界面截图作为确定性图片，不打包站长图片 API 返回的动漫素材。

| 配置 / 页面 | 桌面浅色 | 桌面深色 | 手机浅色 | 手机深色 |
| --- | --- | --- | --- | --- |
| 默认首页 | [1440](p25-default-home-light-1440.png) | [1440](p25-default-home-dark-1440.png) | [390](p25-default-home-light-390.png) | [390](p25-default-home-dark-390.png) |
| 默认阅读、手机展开目录 | [1440](p25-default-reader-light-1440.png) | [1440](p25-default-reader-dark-1440.png) | [390](p25-default-reader-light-390.png) | [390](p25-default-reader-dark-390.png) |
| Fresh 首页 | [1440](p25-fresh-home-light-1440.png) | [1440](p25-fresh-home-dark-1440.png) | [390](p25-fresh-home-light-390.png) | [390](p25-fresh-home-dark-390.png) |
| Minimal 首页 | [1440](p25-minimal-home-light-1440.png) | [1440](p25-minimal-home-dark-1440.png) | [390](p25-minimal-home-light-390.png) | [390](p25-minimal-home-dark-390.png) |
| Minimal 阅读、无目录或复制 | [1440](p25-minimal-reader-light-1440.png) | [1440](p25-minimal-reader-dark-1440.png) | [390](p25-minimal-reader-light-390.png) | [390](p25-minimal-reader-dark-390.png) |
| 自定义配色 / 字体 / 宽度 / 壁纸首页 | [1440](p25-custom-home-light-1440.png) | [1440](p25-custom-home-dark-1440.png) | [390](p25-custom-home-light-390.png) | [390](p25-custom-home-dark-390.png) |
| 自定义阅读、720px 最大行宽 | [1440](p25-custom-reader-light-1440.png) | [1440](p25-custom-reader-dark-1440.png) | [390](p25-custom-reader-light-390.png) | [390](p25-custom-reader-dark-390.png) |
| 空文章站点 | [1440](p25-empty-home-light-1440.png) | [1440](p25-empty-home-dark-1440.png) | [390](p25-empty-home-light-390.png) | [390](p25-empty-home-dark-390.png) |

配置矩阵还覆盖原个人站配置、旧十篇示例和桌面 / 手机的明暗主题。默认模板与原个人配置的迁移方式见 [README](../README.md)。

复现：`python3 tests/theme_audit.py --screenshots`。配置与文章临时输入只写入 `.astro/` 下的测试目录，不改变正式站点数据。更多测试范围和环境见[测试记录](../tests/RESULTS.md)。
