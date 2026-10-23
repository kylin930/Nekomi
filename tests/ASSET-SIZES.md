# P2.2 构建资源体积

2026-10-23，Node.js 24.19.0，生产构建。对比基线为 P2.1 `22ca40e` 构建的 `dist/_astro/*.js` / `*.css`，加上当时实际加载的固定 MDUI 2.1.5 CDN 文件；P2.2 为 npm 按需构建后全部输出的 JS / CSS。**不能仅比较本地产物，否则会漏掉迁移前的远端 MDUI 总包。**

| 资源 | P2.1 原始字节 | P2.2 原始字节 | 原始体积变化 | P2.1 gzip | P2.2 gzip |
| --- | ---: | ---: | ---: | ---: | ---: |
| JS（Astro、站点、MDUI） | 399,852 | 257,105 | −35.70% | 97,204 | 69,570 |
| CSS（站点、MDUI） | 52,636 | 52,506 | −0.25% | 9,962 | 9,591 |
| 合计 | **452,488** | **309,611** | **−31.58%** | **107,166** | **79,161** |

合计约 **441.9 → 302.3 KiB**，逐文件 gzip 合计约 **104.7 → 77.3 KiB（−26.14%）**。gzip 使用 Python `gzip.compress(data, mtime=0)`、默认 level 9 估算；真实网络传输取决于托管服务器压缩方式、缓存、HTTP 头与协商。没有把图片、HTML、字体或未变化的壁纸 Worker 混进这张 JS / CSS 表。

基线本地 JS / CSS 合计 66,894 字节；远端 `mdui.global.js` 为 362,818 字节、`mdui.css` 为 22,776 字节。新产物包含 20 种实际使用的组件及其内部依赖、按需 `setTheme` / `setColorScheme` 和 Astro Prefetch。MDUI 官方 CSS 按文档完整导入，Vite 合并压缩；没有从 `mdui` 总入口导入。浏览器确认不再请求 unpkg，没有 `window.mdui`，未注册未使用的 Slider。

本地正文示例截图原 PNG 为 **161,080 字节**；Astro 输出以下 WebP 候选，由浏览器根据 `sizes` / DPR 选择，而非一次下载全部：

| 宽度 | 字节 |
| --- | ---: |
| 320 | 5,208 |
| 640 | 16,708 |
| 960 | 31,598 |
| 1440 | 58,232 |

四种候选磁盘总量 111,746 字节。封面和头像复用同一资源管线，头像额外按实际 1x / 2x 尺寸裁切；构建期 fixture 验证，不更改默认图片数据。Shiki 在构建期把 token / 双主题颜色写进文章 HTML，因此代码块 HTML 比纯文本版本更大，但没有额外客户端高亮 JS。随机壁纸 API 没有进入 Astro 图片构建。

复核当前 JS / CSS 输出的方法：

```sh
npm run build
python3 - <<'PY'
from pathlib import Path
import gzip
for extension in ('.js', '.css'):
    files = [p for p in Path('dist/_astro').iterdir() if p.suffix == extension]
    print(extension, sum(p.stat().st_size for p in files),
          sum(len(gzip.compress(p.read_bytes(), mtime=0)) for p in files))
PY
```

## P2.3 增量

P2.3 生产输出 JS 为 260,805 字节（逐文件 gzip 70,751），CSS 为 55,226 字节（gzip 9,984），合计 **316,031 字节 / gzip 80,735 字节**，约 **308.6 / 78.8 KiB**。相对 P2.2 增加 6,420 字节（2.07%），gzip 增加 1,574 字节（1.99%）。增量为共享元素导航、可取消的空间 / 透明度动画、目录标记与少量样式；未增加依赖或动画框架。上方 P2.2 迁移表作为历史基线保留。


## P2.4 增量

P2.4 生产输出 JS **269,296 字节 / gzip 73,471**，CSS **56,042 字节 / gzip 10,138**，合计 **325,338 / gzip 83,609 字节**，约 **317.7 / 81.6 KiB**。相对 P2.3 的 316,031 / 80,735 字节，增加 9,307 原始字节（2.94%）、2,874 gzip 字节（3.56%，约 2.81 KiB）。口径仍是生产 `_astro` 下全部 JS / CSS、Python gzip level 9，不含 HTML、字体、图片与 Worker。

增量来自按需列表加载、有限的列表状态缓存及异步搜索焦点。`@astrojs/sitemap` / `@astrojs/rss` 只参与静态构建，没有向浏览器添加 Sitemap / RSS 库；MDUI 仍为 2.1.5、二十种原生组件，没有新的 UI 或动画框架。首页源码只包含六张文章 Card，完整文章元数据供全站搜索；分类 / 月份只保留最多三篇预览，后续文章通过真正的静态分页发现。自动加载只读取 HTML 并取出服务端 Card，不执行其中的布局脚本或重复初始化公共组件。


首页 HTML 对比留存的 P2.3 产物：49,337 → 46,619 原始字节（十张 Card → 六张），逐文件 gzip 7,656 → 8,216 字节。SEO 与可发现性元数据增加了部分不重复字符串，因此压缩后的 HTML 小幅增加；没有把减少 Card 数量描述成所有资源都变小。后续分页仍是独立可访问的静态 HTML。
