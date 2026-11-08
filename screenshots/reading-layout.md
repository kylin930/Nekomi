# 阅读布局与代码高亮截图

以下截图来自 Astro 生产静态产物，由 Python 文件服务器托管。使用 Chromium 154 与 MDUI 2.1.5 npm 按需构建。背景为项目实际请求并检查过的图片样本，在浏览器回放同一响应以保证可比；没有生成或修改素材。默认头像仍为文字回退。

| 状态 | 浅色 | 深色 |
| --- | --- | --- |
| 手机阅读顶部 · 390×844，App Bar 下 16px | [截图](p22-reader-light-390x844.png) | [截图](p22-reader-dark-390x844.png) |
| 手机展开原生 List 目录 · 390×844 | [截图](p22-toc-light-390x844.png) | [截图](p22-toc-dark-390x844.png) |
| 最窄阅读顶部 · 320×700 | [截图](p22-reader-light-320x700.png) | [截图](p22-reader-dark-320x700.png) |
| 最窄展开原生目录 · 320×700 | [截图](p22-toc-light-320x700.png) | [截图](p22-toc-dark-320x700.png) |
| 桌面阅读与右目录 · 1440×900 | [截图](p22-reader-light-1440x900.png) | [截图](p22-reader-dark-1440x900.png) |
| 桌面 Shiki 语法高亮 | [截图](p22-code-light-1440x900.png) | [截图](p22-code-dark-1440x900.png) |
| 手机 Shiki 语法高亮 | [截图](p22-code-light-390x844.png) | [截图](p22-code-dark-390x844.png) |
| 桌面首页 · 1440×900 | [截图](p22-home-light-1440x900.png) | [截图](p22-home-dark-1440x900.png) |
| 手机首页 · 390×844 | [截图](p22-home-light-390x844.png) | [截图](p22-home-dark-390x844.png) |

完整响应式回归还覆盖 1360、1359、1280、1024、960px 及 1119 / 1120 / 1439px 边界，两主题及无壁纸回退，见[测试记录](../tests/RESULTS.md)。截图没有为演示而修改生产文章或默认配置。
