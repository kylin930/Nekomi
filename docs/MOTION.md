# Nekomi P2.3 · 视觉与动效约定

Nekomi 保留衬线标题、中文阅读尺度、融入式侧栏、圆形头像与原来的壁纸层次。动效用于连接文章、解释章节位置和回应操作；不增加 Hero、标题遮罩、侧栏背景或装饰图形。

## 官方依据与实现边界

本轮实际读取了 Material 官方站点的 Motion physics system、Shape、States、Elevation、Typography、Color roles，以及 Expressive motion theming 内容。官网为客户端应用，正文来自其公开内容 JSON（2026-10-13 发布快照），并非只读取页面标题。

- [Motion physics：原理、规格与 Web 转换表](https://m3.material.io/styles/motion/overview/how-it-works)
- [Expressive motion theming：Spatial / Effects 与可中断弹簧](https://m3.material.io/blog/m3-expressive-motion-theming)
- [Shape：形状尺度、交互时形变、嵌套圆角](https://m3.material.io/styles/shape)
- [States：只使用一个状态层、激活色与对应 on 色](https://m3.material.io/foundations/interaction/states/overview)
- [Elevation：表面关系与阴影](https://m3.material.io/styles/elevation/overview)
- [Typography：基础与强调层级](https://m3.material.io/styles/typography/overview)
- [Color roles：语义颜色](https://m3.material.io/styles/color/roles)

官方把位置、尺寸、旋转和形状归为 **Spatial**，允许轻微超调；颜色与透明度归为 **Effects**，不应超调。可中断的阅读滚动继续用轻量弹簧积分；无需手势积分的过渡采用官方 Web 转换曲线。官方形状库的任意形状 Morphing 没有现成 Web API，MDUI 2.1.5 也没有通用 Expressive 弹簧组件 API。本项目不伪造这些 API，只通过公开形状变量、CSS Parts、WAAPI 与 View Transitions 做适合博客的扩展。

## 统一参数

| 用途 | 时长 / 曲线 | 应用 |
| --- | --- | --- |
| Fast spatial | 350ms · `cubic-bezier(.42,1.67,.21,.90)` | 面板方向、卡片小幅缩放与形状、目录位置标记 |
| Default spatial | 500ms · `cubic-bezier(.38,1.21,.22,1)` | 页面方向与共享标题 / 封面边界 |
| Default effects | 200ms · `cubic-bezier(.34,.80,.34,1)` | 内容透明度、目录原生激活背景和文字颜色 |
| 阅读滚动 | 质量 1、刚度 220、阻尼 28 | 可中断、重定位、精确标题偏移，保留原实现 |
| 壁纸 / 主题表面 | 650ms，无超调曲线 | 保留 P2.2 的首次淡入与主题切换节奏 |

参数在 `tokens.css`。新增变量使用 `--nekomi-*`，不冒充 MDUI 不存在的弹簧 / Expressive Tokens。原生 MDUI 控件继续使用自身 `--mdui-motion-*`。卡片静止 20px 圆角、Hover 24px、Press 16px；实际位移只有缩放 1.003 / .997，不再整张上浮 3px。公开 `--shape-corner` 驱动形变，悬停阴影采用 MDUI `--mdui-elevation-level1`。

`motion.js` 的时间解析同时支持 `ms` 和 `s`。Vite 会把 `350ms` 压成 `.35s`，WAAPI 却需要毫秒；直接 parseFloat 会让内容进入动效缩短一千倍。浏览器回归直接检查生产动画的 350 / 200ms，而非只检查 CSS 字符串。空间和透明度用两条动画处理，快速重触发从当前可见状态接续；祖先已有进入动画时不叠加子层进入动画。

## 哪些交给 MDUI

- Button / Chip / List Item 的 Ripple、Hover / Focus / Press 状态层与激活语义。
- Tabs 的指示器位置、宽度与原生过渡，不新增第二条 Tab 指示器。
- Drawer / Dialog 的开闭、Scrim、焦点约束和恢复、滚动锁。
- Collapse 的展开高度与开闭事件；目录跳转仍等待 `closed` 后定位。

## 哪些由 Nekomi 扩展

- **共享文章元素**：在 Astro `before-preparation` 给当前可见文章标题临时分配 `post-title`，在 `before-swap` 给对应目标分配相同名称。当前导航只有一对，不给十张卡片同时注册名称；没有标题可匹配、标题不在视口、文章之间切换等情况走普通页面过渡。标题只绘制目标文字快照，随边界等比缩放，避免两个字号交叉淡入时形成重影。图片已加载且目标在 180ms 内完成预热解码时，额外衔接 `post-cover`；慢图 / 坏图只衔接标题，不延迟正常导航。浏览器历史和返回同样适用。完成、取消与减少动效切换均清理名称，并解除尚未完成的图片预热等待。
- **页面内容**：进出方向与历史方向对应，空间移动和透明度分离。文章标题与封面从正文快照中单独提取，避免重复绘制。壁纸、侧栏、App Bar 和 Drawer 仍保留原 DOM；不参与整屏淡入。
- **目录**：继续使用原生 List Item `active` / `aria-current`；原生选中背景和文字做颜色过渡，侧边 3px 装饰标记连接章节位置，不承载交互或选中语义。只在章节或尺寸变化时读取标记几何，离开页面断开 ResizeObserver。
- **局部内容**：Tabs 新面板按选择方向进入；搜索立即过滤、100ms 合并一次结果过渡。WAAPI 动画可取消，页面切换时清理；不改组件 Shadow DOM 的内部动画。

`prefers-reduced-motion: reduce` 下不命名共享元素、不预热共享图片、不运行自定义 WAAPI 进入，CSS 与 MDUI 时长降为 1ms，滚动立即定位。没有 View Transition API 时保留 Astro 原生 fallback 与正常链接。

## 文案与示例数据

公开页面不再显示“演示文章”“阅读演示”等阶段说明。首页保留真实数量、搜索反馈和导航用途；评论未提供定位节点时只提示阅读对应文章，不伪造可用锚点。技术文章整理为普通说明，目录和代码结构保留；音乐 / 散步内容改为一般性建议，不把虚构叙事改写成站长真实经历。

`demo`、`demoNotice` 与评论示例字段仍保留，开发文档继续明确说明默认内容是可替换样例。没有新增友链、评论、真实经历或项目成果。原 P2 迁移基线保留在 `tests/fixtures/content-baseline.json`；P2.3 文案摘要及明确的标题 / 代码修改另存 `editorial-p23.json`，不覆盖历史证据。

## P3.1 内容阅读

内容 Tabs 继续使用 MDUI 自带指示器 / Ripple / 键盘交互；折叠采用浏览器原生 details，不另加动画框架。隐藏章节的锚点跳转先等待面板显示，再使用原有目录弹簧与焦点逻辑。PhotoSwipe 管理灯箱缩放 / 手势，减少动态设置下将打开、关闭与缩放时长设为 0；离页销毁实例。Mermaid 主题更新直接换图，不叠加额外弹跳或布局过渡。
