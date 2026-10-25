# 通用主题配置实际截图

Chromium 154，Astro 生产静态输出。默认站点保留原文章；另两套配置使用 `.astro/` 下的临时文章和受控评论 API，不是站长的真实经历或社交数据。两套自定义配置在示例基础上临时启用了测试字体和只读评论适配器；完整测试配置位于 .astro/p25-tests/personalization-*/site.json，公开示例不依赖这些测试资源。

| 配置 | 桌面首页，1440×900，浅色 | 手机阅读，390×844，深色 |
| --- | --- | --- |
| 原版默认 | [截图](personalization-default-home-1440.png) | [截图](personalization-default-reader-390.png) |
| 中文个人站 / 纽约显示时区 / 自定义分类 | [截图](personalization-personal-home-1440.png) | [截图](personalization-personal-reader-390.png) |
| 英文通用站 / UTC+14 / 子路径 | [截图](personalization-journal-home-1440.png) | [截图](personalization-journal-reader-390.png) |

各配置实际还测试了相反主题与视口组合、分类 / 标签 / 归档及侧栏，见 [测试结果](../tests/RESULTS.md)。[配置示例与说明](../docs/PERSONALIZATION.md) · [审计记录](../docs/PERSONALIZATION-AUDIT.md)。

没有新增插画、头像、角色素材或默认网页字体。字体测试临时复用已安装的 KaTeX Main WOFF2（MIT），仅复制到被忽略的测试构建，不加入 public 或主题默认资源；MDUI 图标继续使用既有 Material Icons。UI 及临时文章为本项目测试内容。
