# 返回顶部 FAB 实际截图

Astro 生产静态构建，原版默认配置与原有 Markdown 扩展示例文章，Chromium 实测。默认壁纸关闭，没有新增图片素材或改变文章内容。

- [桌面文章 · 1440×900 · 浅色](back-to-top-desktop-light.png)
- [手机文章 · 390×844 · 深色](back-to-top-mobile-dark.png)

使用 `python3 tests/back_to_top_audit.py --screenshots` 重新生成。回归矩阵另外在临时内容中验证浅深 / 根子路径、无限加载、历史恢复、浮层优先、触控安全区和关闭配置，不将这些临时文章或壁纸加入默认模板。

[配置方式](../docs/CONFIGURATION-GUIDE.md#返回顶部按钮) · [测试说明](../tests/README.md#全站返回顶部-fab)
