# v1.0 个性化配置验收

实际 Chromium 154 访问 Astro 生产静态产物。截图使用临时图片验证透明区域、比例、遮挡和加载行为；**不是 Nekomi 默认美术资源**，用户需要提供自己的素材。

| 场景 | 浅色 | 深色 |
| --- | --- | --- |
| 桌面侧栏，1440×1000 | [截图](v100-decorations-home-light-1440.png) | [截图](v100-decorations-home-dark-1440.png) |
| Waline 评论独立右栏，1440×1000 | [截图](v100-decorations-comments-light-1440.png) | [截图](v100-decorations-comments-dark-1440.png) |
| 手机评论，默认隐藏，390×844 | [截图](v100-decorations-comments-light-390.png) | [截图](v100-decorations-comments-dark-390.png) |
| 手机显式开启小图，390×844 | [截图](v100-decorations-comments-light-390-opt-in.png) | [截图](v100-decorations-comments-dark-390-opt-in.png) |

[默认无装饰桌面](v100-decorations-default-reader-1440.png) · [默认无装饰手机](v100-decorations-default-reader-390.png) · [默认无装饰 Drawer](v100-decorations-drawer-390.png) · [显式开启 Drawer](v100-decorations-drawer-opt-in-390.png)

评论使用真实 SDK + 受控 API；自定义适配器截图为只读 REST 示例，不代表内置登录 / 编辑功能。导航生命周期、隐藏条件及测试命令见 [测试说明](../tests/README.md)，配置见 [装饰使用指南](../docs/DECORATIONS.md)。

## 截图素材来源与许可

- 透明测试人物：**Twemoji — Standing Person (1F9CD)**，Twitter, Inc. and other contributors，[PNG 原文件](https://github.com/jdecked/twemoji/blob/b6b55fef1e8636b540a6d016a4729ca8cdf2e60b/assets/72x72/1f9cd.png)，[CC BY 4.0](https://github.com/jdecked/twemoji/blob/b6b55fef1e8636b540a6d016a4729ca8cdf2e60b/LICENSE-GRAPHICS)。使用原 PNG，没有生成或重绘人物；截图中按配置缩放 / 降低透明度。测试文件 SHA-256：`d13ddabf546f9dec18b0c19778d79937573cd266f6154d531d85c1ae788fb86b`。
- 临时壁纸：**Fronalpstock big**，Hannes Röst，[Wikimedia Commons 原文件及作者信息](https://commons.wikimedia.org/wiki/File:Fronalpstock_big.jpg)，[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)。下载官方 1280px 缩略图，截图中随页面缩放、裁为壁纸并加现有主题遮罩。
- 本文链接的 `v100-decorations-*.png` 合成截图按 **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)** 分享，署名同时包括上述原作者与 Nekomi contributors；不改变 Nekomi 源码的 MIT 许可。

素材仅下载至 `/tmp` 并复制到忽略的临时测试产物，没有加入 `public/`、`src/assets/` 或任何主题默认配置，也不会出现在正常构建的 `dist/` 中。未使用 Cuckoo 的 GPL 代码或图片。
