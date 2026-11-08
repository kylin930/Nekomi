# 视觉与动效约定

本文面向主题开发和深度定制，说明 Nekomi 的视觉延续与动效参数。日常使用不需要修改这里：主题色、字体、壁纸等通过 `site.config.json` 配置，见[简明配置指南](CONFIGURATION-GUIDE.md)。

Nekomi 保留衬线标题、中文阅读尺度、融入式侧栏、圆形头像与壁纸层次。动效只用于连接文章、解释章节位置和回应操作，不增加 Hero、标题遮罩、侧栏背景或装饰图形。

## 设计原则

- 位置、尺寸、旋转和形状属于 **Spatial**，允许轻微超调；颜色与透明度属于 **Effects**，不超调。
- 可中断的阅读滚动使用轻量弹簧；无需手势积分的过渡使用官方 Web 转换曲线。
- 原生 MDUI 组件优先。主题只通过公开形状变量、CSS Parts、WAAPI 与 View Transitions 扩展，不伪造不存在的弹簧 API。
- 系统开启“减少动态效果”时，所有自定义动画与 MDUI 动画一起降级。

## 统一参数

| 用途 | 时长 / 曲线 | 应用 |
| --- | --- | --- |
| Fast spatial | 350ms · `cubic-bezier(.42,1.67,.21,.90)` | 面板方向、卡片小幅缩放与形状、目录位置标记 |
| Default spatial | 500ms · `cubic-bezier(.38,1.21,.22,1)` | 页面方向与共享标题 / 封面边界 |
| Default effects | 200ms · `cubic-bezier(.34,.80,.34,1)` | 内容透明度、目录原生激活背景和文字颜色 |
| 阅读滚动 | 质量 1、刚度 220、阻尼 28 | 可中断、可重定位、精确标题偏移 |
| 壁纸 / 主题表面 | 650ms，无超调曲线 | 首次加载淡入与主题切换 |

参数在 `tokens.css`。自定义变量使用 `--nekomi-*`，不冒充 MDUI 不存在的弹簧或 Expressive Tokens；原生 MDUI 控件继续使用自身 `--mdui-motion-*`。卡片静止 20px 圆角、Hover 24px、Press 16px；实际位移只有缩放 1.003 / .997，不再整张上浮。公开 `--shape-corner` 驱动形变，悬停阴影采用 MDUI `--mdui-elevation-level1`。

`motion.js` 的时间解析同时支持 `ms` 和 `s`。Vite 会把 `350ms` 压成 `.35s`，WAAPI 却需要毫秒，因此不能直接 `parseFloat`。浏览器检查生产动画的实际 350 / 200ms，而不是只检查 CSS 字符串。空间和透明度使用两条动画；快速重触发从当前可见状态接续，祖先已有进入动画时不叠加子层动画。

## 交给 MDUI

- Button / Chip / List Item 的 Ripple、Hover / Focus / Press 状态层与激活语义。
- Tabs 的指示器位置、宽度与原生过渡，不新增第二条 Tab 指示器。
- Drawer / Dialog 的开闭、Scrim、焦点约束与恢复、滚动锁。
- Collapse 的展开高度与开闭事件；目录跳转仍等待 `closed` 后定位。

## 主题扩展

- **共享文章元素**：在 Astro `before-preparation` 给当前可见文章标题临时分配 `post-title`，在 `before-swap` 给对应目标分配相同名称。当前导航只处理一对名称，不给所有卡片同时注册；没有匹配标题、标题不在视口或文章之间切换时使用普通页面过渡。标题只绘制目标文字快照，随边界等比缩放，避免两个字号交叉淡入时形成重影。
- **封面过渡**：图片已加载且目标在 180ms 内完成预热解码时，额外衔接 `post-cover`；慢图或坏图只衔接标题，不延迟正常导航。浏览器历史和返回同样适用。完成、取消与切换减少动效时清理名称，并解除未完成的图片预热等待。
- **页面内容**：进出方向与历史方向对应，空间移动和透明度分离。壁纸、侧栏、App Bar 和 Drawer 保留原 DOM，不参与整屏淡入。
- **目录**：继续使用原生 List Item 的 `active` / `aria-current`；原生选中背景和文字做颜色过渡，侧边 3px 装饰标记连接章节位置，不承载交互或选中语义。只在章节或尺寸变化时读取标记几何，离开页面断开 `ResizeObserver`。
- **局部内容**：Tabs 新面板按选择方向进入；搜索立即过滤，100ms 合并一次结果过渡。WAAPI 动画可取消，页面切换时清理；不修改组件 Shadow DOM 的内部动画。

## 减少动态与兼容

`prefers-reduced-motion: reduce` 下不命名共享元素、不预热共享图片、不运行自定义 WAAPI 进入，CSS 与 MDUI 时长降为 1ms，滚动立即定位。没有 View Transition API 时保留 Astro 原生 fallback 与正常链接。

## 内容组件

内容 Tabs 使用 MDUI 自带指示器、Ripple 与键盘交互；折叠使用浏览器原生 `<details>`，不引入动画框架。隐藏章节的锚点跳转先等待面板显示，再使用目录弹簧与焦点逻辑。

PhotoSwipe 管理灯箱的缩放与手势；减少动态时将打开、关闭与缩放时长设为 0，离页销毁实例。Mermaid 主题更新直接换图，不叠加额外弹跳或布局过渡。

## 返回顶部

原生 [MDUI FAB](https://www.mdui.org/zh-cn/docs/2/components/fab) 的形状、明暗 Surface、Elevation、Ripple 和键盘行为由 MDUI 2.1.5 处理。Nekomi 只在外层使用 Fast spatial（350ms）与 Default effects（200ms）做小幅位移、缩放和淡入淡出，不覆盖组件自身过渡；减少动态时没有显隐动画。

`layout.backToTop` 默认开启，控件随公共布局持久化，仅初始化一次。滚动监听为 passive，通过 `requestAnimationFrame` 合并可见性更新，不观察正文子树，也不为无限滚动卡片逐一绑定事件。原生 Drawer / Dialog / Snackbar 关闭完成前及 PhotoSwipe 存在时暂时隐藏，避免抢占浮层；移动端使用 `safe-area-inset` 留边。

点击后焦点移到 `main`，再复用可中断的阅读弹簧滚到顶部；减少动态时立即跳转。不会清除文章 Hash、增加历史记录或改写 Astro 原生滚动恢复，导航后从实际 `scrollY` 同步状态。关闭配置不渲染控件或加载对应模块，无障碍名称使用 `ui.navigation.backToTop`。

## 参考资料

- [Motion physics：原理、规格与 Web 转换表](https://m3.material.io/styles/motion/overview/how-it-works)
- [Expressive motion theming：Spatial / Effects 与可中断弹簧](https://m3.material.io/blog/m3-expressive-motion-theming)
- [Shape：形状尺度、交互时形变、嵌套圆角](https://m3.material.io/styles/shape)
- [States：状态层、激活色与对应 on 色](https://m3.material.io/foundations/interaction/states/overview)
- [Elevation：表面关系与阴影](https://m3.material.io/styles/elevation/overview)
- [Typography：基础与强调层级](https://m3.material.io/styles/typography/overview)
- [Color roles：语义颜色](https://m3.material.io/styles/color/roles)
