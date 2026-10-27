# 独立页面、侧栏布局与自定义脚本 · 2026-10-26

基于最新 main f8e44c5，在 work 分支开发；保持 1.0.0、Astro / MDUI 2.1.5 和依赖锁文件。用户要求停止扩大测试后，没有再运行完整矩阵，只完成已发现问题的定向核对。

- **150 项单测通过**；Astro Check **0 errors / 0 warnings / 1 原有 execCommand hint**。默认静态构建成功，增加关于 / 项目两个独立页后为 **18 页**。组合配置的生产构建成功，默认首页没有增加 Tab 或脚本请求。
- 此前完成 **根 / 子路径 × 桌面 / 手机 × 浅深 8 组组合浏览器检查**：真实页面面板、正文 ID 唯一、内层原生 Tabs 切出切入保留状态、独立 URL / SEO / 草稿 / 嵌套路径，常驻友链与全部常驻布局，页面评论与稳定身份、最新留言指向实际页面，未打开 Drawer 不查询。
- 自定义脚本以受控 ESM / classic 响应实测：SRI 验证、错误资源不执行、禁用不请求、全站只求值 / 挂载一次、页面多次进入只保留一个容器、页面离开解除事件、异步返回清理。字体使用实际 Noto Sans WOFF2 原始字节，验证外部 CORS 成功 / 错误 Origin 回退、子路径本地 italic、单次 preload 与跨页不重复请求。WebFonts 源码未改。
- 加入更严格的返回坐标检查后发现：MDUI 面板从 SSR 隐藏状态激活时，CSS scroll anchoring 会选择页脚，造成原生恢复后再次偏移。已仅在列表恢复期间暂时排除该子树，完成 slots 后恢复正常 anchoring；未重写路由或 scrollTo 恢复。
- **最后定向核对通过**：桌面 1440px / 手机 390px，带正文 Hash 的首页页面 Tab → 独立 URL → 浏览器后退，各连续三次，保留 Tab 和原滚动坐标。此修正之后未重跑整个组合矩阵或旧阶段全量套件，遵循用户最新要求。
- Zod / JSON Schema、完整默认配置、组合配置、写作 / 侧栏 / 脚本指南及变更记录已同步。示例脚本默认关闭；新页面均明确 demo:true，未修改原文章或内置友链页面实现。

[配置与文件入口](../docs/PAGES.md) · [组合示例](../examples/site-features.config.json) · [实际截图](../screenshots/SITE-FEATURES.md)。实测 Chromium；评论服务为现有 REST 自定义适配器与受控响应，本轮未重新实测所有生产 SDK、登录 / 审核流程或真实 Live2D。原适配器协议与类型别名保留，不宣称完成这些额外验证。未创建 Tag / Release 或部署。

---

# 全站返回顶部 FAB · 2026-10-25

基于 work `59b3574`（包含最新 main `31dee94`），版本保持 1.0.0，MDUI 保持 2.1.5。没有新增依赖、修改文章或重新实现友链页。

- **119 项单测通过**；Astro Check **0 errors / 0 warnings / 1 原有 execCommand hint**。生产构建成功，默认 **16 张静态页面**；示例 noindex / 空 Sitemap 提示仍符合原保护策略。
- **根路径和 /Nekomi/ × 桌面 / 手机 × 浅深 = 8 组实际浏览器通过**。验证原生 mdui-fab / Ripple / 按钮无障碍名称、400px 隐藏和 401px 显示、Enter 激活及 main 回焦、单次点击仅一次滚动、滚轮中断、减少动态立即回顶。目录跳转后回顶保留原 Hash 和 history.length。
- **持久化与列表恢复通过**：14 篇临时长文、无限加载后的批次和准确滚动位置、前进 / 后退、首页 / 文章 / 友链页多次往返，FAB、壁纸图像、侧栏和 performance.timeOrigin 保持相同。控件只同步可见性，不接管 Astro 恢复或新增历史项。
- **安全区域和浮层通过**：Chromium CDP 覆盖真实 env 安全区，手机底部 34px / 右侧 10px 时外层计算偏移为 50px / 26px；另测 960×720、320×700、1440×500，无横向溢出，按钮在窗口内。Drawer / Dialog / Snackbar / 实际 PhotoSwipe 打开及关闭过程中 FAB 不可操作，关闭完成后恢复。
- **关闭与默认状态通过**：layout.backToTop=false 没有控件、FAB 注册或对应模块请求。默认短首页不足 400px 不强行显示；无 JS 不暴露失效控件。自定义英文名称在实际内部 button 上生效。
- **既有友链能力通过**：桌面 / 手机侧栏“查看全部”进入原有 /friends/，根 / 子路径 HTTP 200，独立页完整显示六条测试友链，Drawer 关闭且不打开旧 Dialog；friendsPage.enabled=false 时仍使用原 Dialog。Friends / Sidebar / FriendItem 源码未改动。
- **P2.4 原有回归通过**：42 篇临时文章 / 七页，首五帧准确滚动恢复、全量搜索 / 分类标签、批次、前进后退 / 章节返回、慢请求 / 503 / 重试 / 取消、追加 Prefetch / 共享过渡，无 JS 遍历全部静态分页，SEO / RSS / Sitemap / Robots 保护均正常。
- 文档 / 锚点 / JSON 示例检查通过；Zod、JSON Schema、完整配置和英文示例同步。两张交付图来自原版默认配置与原有扩展示例，未提交临时文章、测试壁纸或新素材。

[实际截图](../screenshots/BACK-TO-TOP.md) · [配置方式](../docs/CONFIGURATION-GUIDE.md#返回顶部按钮) · [测试复现](README.md#全站返回顶部-fab)。浏览器实测为 Chromium 154，未实测 Firefox / Safari。Google Fonts 沿用保留 TLS 验证的 curl 缓存回放；没有关闭证书验证。新功能不涉及评论 SDK 修改或远端内容发布。

---

# v1.0.0 通用主题个性化审计 · 2026-10-25

基于 main `92170a3`，在 work 分支开发。保持版本 1.0.0、Astro / MDUI 2.1.5 和依赖锁文件。Node.js 24.19.0 / npm 11.9.0、Playwright 1.62.0 / Chromium 154，访问生产静态输出。

- **118 项单测通过**：增加配置默认 / 部分覆盖 / 错误字段路径、分类角色与 HEX 去重、默认分类身份与旧数据、跨时区日历日期 / 评论时间 / 年界、文案占位符、字体 / 导航安全输入及 Markdown 自动摘要检查。
- **Astro Check 0 errors / 0 warnings / 1 原有 execCommand hint**；生产构建成功，默认 **16 张静态页面**。默认示例 noindex，因此 Sitemap 的 No pages found 属于预期。
- **三套配置 × 四组视口 / 主题 = 12 组浏览器通过**：默认原版；纽约时区的中文个人站，旅行 / 摄影 / 资料分类与自定义颜色、文案；UTC+14 的英文 Field Journal，完全不同的临时文章、最小预设、禁用角标 / 归档预览与 `/Journal/` 子路径。英文界面来自显式 UI 配置，没有宣称 language 会自动翻译。
- 首页、文章、分类 / 标签 / 归档标题与预览数、侧栏三种名称、搜索反馈、普通链接 / 外链新窗口属性、友链静态页及返回导航正确。内建 Tab ID / Hash 保留，普通链接没有伪装成 Tab；无 JS 时真实链接可见，未定义组件不会重复显示标签。
- 自定义 HEX 生成 MDUI 浅深不同角色，分类文字 / 容器对比度 **≥4.5**；不再根据旧中文分类名字变色。省略、null、旧未分类文章使用内部空键，默认名称可变，未凭显示名错误推荐；预览为 0 不输出空列表，文章与静态索引仍完整。
- 两个自定义站点实际加载临时本地 WOFF2，覆盖根 / 子路径、系统回退；默认没有新字体请求。UI 复用 runtime 数据，初始站点索引仅解析一次，文章与普通页面间导航保留文档 timeOrigin、壁纸层和公共侧栏。
- 日期 SSR 和运行时共用格式化工具。文章 2026-01-01 不因纽约或 UTC+14 偏移日期；受控评论的 2026-01-01T01:30Z 按站点时区显示，包括前一天情况。Markdown 的默认提示 / 折叠 / 复制控件也按 UI 配置显示；源码围栏不进入自动摘要，原正文不变。
- **原有回归通过**：阅读套件的灯箱 / 公式 / 图表 / 指令 / 锚点 / 无 JS / 关闭功能；Waline / Twikoo / Giscus / Artalk / Custom 及失败 / 慢请求 / 取消压力；六套主题 24 组；42 篇临时文章 / 七页的搜索、分类标签、静态分页、无限加载、首帧滚动恢复、Prefetch / Shared Transition 和原生历史导航。
- **SEO 保护通过**：根路径及 `/Nekomi/` 中，三篇原样 demo:true 示例继续 noindex，排除 RSS / Sitemap / BlogPosting，临时真实文章正常收录。没有改动源文章、demo 值、许可证或依赖版本；没有新增框架、默认素材或字体资产。

[审计记录](../docs/PERSONALIZATION-AUDIT.md) · [配置与示例](../docs/PERSONALIZATION.md) · [实际截图](../screenshots/PERSONALIZATION.md)。浏览器实测仅 Chromium；评论为真实 SDK + 受控服务响应，未验证生产账号登录 / 审核。完整多语言包、复数与 RTL 自动切换不属于本轮，第三方 SDK 内部仍使用其官方语言选项。

---

# v1.0 个性化装饰与配置补全 · 2026-10-25

基于最新 main `3a794f0`，在 work 分支开发。版本保持 1.0.0，Astro / MDUI 2.1.5 / 依赖锁文件、三篇示例及其 demo 保护、既有布局和配色不变。Node.js 24.19.0 / npm 11.9.0，Playwright 1.62.0 / Chromium 154，访问生产静态产物。

- **92 项单测通过**。Astro Check **0 errors / 0 warnings / 1 原有 execCommand hint**；生产构建成功，默认仍为 **16 张静态页面**。示例站 Sitemap 的 “No pages found” 是预期保护结果。
- **装饰矩阵通过**：Waline / Twikoo / Giscus / Artalk / Custom 五套根路径及 Custom `/Nekomi/`；检查 1440×1000、1280×800、1024×768、390×844、320×700，以及 1440×500 短视口。覆盖浅深与系统主题、深色来源复用、偏移、比例、透明度、默认不在手机显示及显式开启。真实触控 Drawer 验证可选立绘不遮挡原控件。
- **评论隔离与生命周期通过**：装饰仅在 Nekomi 自有容器，通过几何断言确认图片与评论挂载区不相交；宽屏右栏、窄屏上方小图、手机默认隐藏。服务失败时隐藏，重试后恢复；反复切换文章 / 后退时仅有一个装饰节点、旧节点断开。评论单独启用时首页不加载装饰，进入文章才初始化，返回清理；没有修改第三方适配器或私有结构。
- **边界构建通过**：来源为空 / 空白、预览数量为 0、评论关闭、坏图、拥挤侧栏 / Drawer。损坏评论图片去掉右栏占位，实际 Waline 文本框仍可输入；自定义组件过宽时自动退为上方装饰。人物让位于内容，不增加滚动容器；减少动态时没有装饰动画。
- **壁纸与图标通过**：根 / 子路径 favicon、Apple 图标和移动来源正确；空图标不输出错误链接。实际 `/Nekomi/` Worker 控制与缓存、刷新复用、断点选源、内部导航相同壁纸 DOM / 图片、失败回退、慢速旧主题图片取消均通过。未配置移动来源时沿用桌面，随机 API 仍在运行时处理。
- **原有回归通过**：Markdown 桌面 / 手机 × 明暗、灯箱 / KaTeX / Mermaid / 指令 / 代码 / 锚点、无 JS 与功能关闭；六套配置 24 组主题 / 响应式检查；五种评论与失败 / 慢请求 / 取消压力检查；42 篇文章、七页静态分页 / 无 JS / 全量搜索 / 分类标签 / 列表恢复 / 首帧滚动 / Prefetch / Shared Transition。
- **SEO 保护通过**：`release_audit.py` 在 `/` 和 `/Nekomi/` 验证三篇原样 demo:true 仍 noindex，排除 RSS / Sitemap / BlogPosting，临时真实文章正常收录；源示例字节未变化。
- 无新增依赖或默认人物素材。装饰模块 **2553 bytes / gzip 1178 bytes**，默认无装饰时不请求；临时 PNG / 壁纸只在 `/tmp` 和忽略的测试产物，不进入默认 dist。截图素材来源、署名和许可见下方链接。

[桌面 / 手机实际截图](../screenshots/DECORATIONS.md) · [装饰配置](../docs/DECORATIONS.md) · [完整配置示例](../examples/full.config.json)。README、Zod / JSON Schema 与配置文档已同步。

验证边界：评论使用真实 SDK + 受控 API，不向真实服务发布内容，不宣称验证了生产登录 / 审核。浏览器实测为 Chromium。测试初期，在原生 View Transition 尚未就绪时通过 CDP 改设备尺寸会偶发 Chromium 快照超时；视口矩阵现于 `finished` 后改变设备指标，快速前进后退仍单独验证。未通过吞异常或修改生产导航规避测试。装饰按自有容器定位，不承诺与第三方私有输入字段精确对齐。

---

# v1.0.0 发布前核心回归 · 2026-10-24

基于最新 main `fd0e322`（P3.1 合并结果），在 work 分支收尾。仅移除文章顶部示例标签及其专用样式，更新版本与发布文档；示例 Markdown、demo schema、SEO / RSS / Sitemap 实现和依赖版本保持不变。

- `package.json`、锁文件顶层与根包版本均为 **1.0.0**；Node.js 要求仍为 **≥22.23.4**，推荐 **24 LTS**。使用 Node.js 24.19.0 / npm 11.9.0、Playwright 1.62.0 / Chromium 154 验证。
- **88 项单测通过**。Astro Check 为 **0 errors / 0 warnings / 1 hint**（原有 execCommand 剪贴板降级）；默认生产构建成功，输出 **16 张静态页面**。示例站的 Sitemap “No pages found” 仍是预期结果。
- 新增 `release_audit.py`：核对版本、Node.js、MDUI 2.1.5、MIT 许可与中文发布说明；在 `/` 和 `/Nekomi/` 的临时正式发布配置中，验证三篇原样复制的 demo:true 示例没有顶部标签，仍 noindex、排除 RSS / Sitemap / BlogPosting；另加的临时非 demo 文章正常收录。核对源文件字节未变化，没有将示例改成正式文章。
- **Markdown 浏览器回归通过**：桌面 / 手机 × 浅色 / 深色，检查标签确实不在文章头部；灯箱、公式、图表、指令、隐藏章节 / Hash、视频按需加载、相关文章、友链、跨页清理、无 JS 和功能全关状态正常。
- **五种评论方式通过**：Waline / Twikoo / Giscus / Artalk / Custom 的懒加载、计数、主题、历史导航、销毁、侧栏能力与移动端。使用真实客户端 SDK 和受控服务响应，未向真实服务发布评论。
- **六套主题配置 24 组浏览器检查通过**：Default / Fresh / Minimal / 自定义子路径 / 空站 / 原个人配置；覆盖明暗、移动 Drawer、配置覆盖、公共 DOM / 壁纸 / 主题持久化与 ClientRouter。
- **42 篇文章 / 七页浏览回归通过**：SEO 元数据、RSS / Sitemap / Robots、静态分页、全量搜索 / 分类 / 标签、加载批次、原生滚动恢复及首五帧、前进后退 / 相邻文章 / Hash、慢响应 / 503 / 重试 / 取消、追加 Prefetch / 共享过渡；无 JS 也能遍历全部文章。
- MIT 主题许可与第三方许可清单保持准确，生成许可文件无变化；没有新增依赖、素材、功能或部署动作。仓库当前尚未启用 GitHub Template，文档已提供克隆方式并明确模板入口需维护者启用。

[中文 Release 说明草稿](../docs/releases/v1.0.0.md)已准备好；此次工作只提交代码，Tag 与 GitHub Release 由维护者决定创建时间。验证边界沿用下方 P3.1 记录：仅实测 Chromium，视频与远程评论对端为受控回放，不代表实际登录 / 地区限制 / 服务部署验证。

---

# P3.1 文章阅读与 Markdown · 0.6.0 · 2026-10-24

基于最新 main `5b31903`（P3.0 合并结果），在 work 分支开发。保持 Astro 7.4.2、MDUI 2.1.5、Node.js 24.19.0 / npm 11.9.0。浏览器为 Playwright 1.62.0 + Chromium 154，访问生产静态 HTML，由 Python 提供文件服务，不运行生产 Node 后端。

- **88 项单测通过**：配置 34、社交图标 10、评论 23、阅读 / Markdown 21。新增中英文计数与代码 / 数学排除、相关文章排序与草稿 / demo 隔离、危险链接 / 属性拒绝、指令结构 / 层级限制、行内冒号文字兼容和单篇开关。
- **Astro Check：0 errors / 0 warnings / 1 hint**，仍是原有 execCommand 剪贴板降级提示。清理生成缓存后普通 `npm run build` 成功，默认输出 **16 张静态页面**。默认全站及示例 noindex，所以 Sitemap 集成的 “No pages found” 属于预期；真实内容 / 发布配置已通过根与子路径 SEO 测试。
- **P3.1 根路径 + /Nekomi/**：每种路径均验证桌面 1440×900 / 触控手机 390×844 × 浅深四组，以及 1024px / 320px 无横向溢出。实际 KaTeX HTML + MathML、流程 / 时序 SVG、六类扩展、图库 / 说明 / 原图、原生 Tabs / 折叠、视频点击前零 iframe 请求、相关文章排除、独立友链页及旧公共 DOM / timeOrigin 持久化。
- **真实触摸输入与生命周期**：通过 Chromium CDP touch 输入完成滑动切图、双指缩放、放大后拖动；方向键、Tab 焦点圈定、Esc 回焦、单图、坏图、缺失原图、链接图片真实跳转、减少动态、灯箱打开时不触发搜索 Drawer、带查看器离页时清理 DOM / head CSS。
- **图表与隐藏内容边界**：初次引擎请求期间切换主题、已渲染图表隐藏后变色再展开、错误源码 / 禁止内嵌配置回退；嵌套 Tabs 的键盘 / ARIA 不串层，关闭 Details 内的标题不参与目录高亮，直接 Hash 打开、目录自动展开 / 切换和焦点正确。
- **无 JS 与功能全关**：无脚本时公式、全部 Tab 正文、原生 details、图片、图表源码、平台 / 链接卡片 / 友链真实链接可读。全关配置不渲染图表 / 视频控件、相关文章 / 时长或 friends 路由，不加载 Mermaid、灯箱、KaTeX 字体或对应附加样式。
- **图片构建**：本地响应式 WebP / srcset / 固有尺寸保持不变；灯箱的原图与相应静态文件在冷缓存和缓存重建后均为 HTTP 200。源目录外的相对图片使用 Astro 公共 getImage 输出同格式全分辨率版本，不复制私有 Astro 注册逻辑；额外验证内容相同但路径不同的资源与连续两次构建，内部文件路径不会泄露到 HTML。
- **兼容回归**：六套配置 24 组（Default / Fresh / Minimal / 自定义 / 空站 / 原个人站）及 P3.0 五套配置 20 组通过。原 P0–P2.4 **18 组完整套件**通过，覆盖原文 / 代码 / 锚点、目录弹簧与中断、主题 / Drawer、Shiki / Prefetch、共享过渡、背景 Worker / 原 DOM、八种视口和壁纸对比度。
- **分页 / SEO 根子路径**：42 篇临时文章、七张静态分页，实际无 JS 遍历全部；搜索 / 分类标签、批次和首五帧滚动恢复、503 / 重试 / 竞态、Canonical / OG / JSON-LD / Sitemap / RSS / Robots 全部通过。无脚本标签断言改为限定实际标签面板，避免新增的相关文章回退链接影响全局选择器。
- **评论**：Waline / Twikoo / Giscus / Artalk / Custom 五种方式与失败 / 取消压力测试通过；九项配置边界、桥接文档 noindex、重复稳定键 / 不存在自定义模块的预期构建失败通过。新增示例也包含“排版”，独立评论失败测试改用完整标题搜索，保持一条明确命中的原意。

## 按需资源实测

浏览器请求本地 Vite 资源的去重总和，gzip 为逐文件估算；不含既有 Google Fonts 请求、图片与 HTML。具体站点传输取决于服务器压缩 / 缓存。普通文章不含图表或公式，也尚未打开灯箱：

| 场景 | 累计 JS（原始） | 累计 JS（gzip） | 本地公式字体 |
| --- | ---: | ---: | ---: |
| 普通 welcome 文章首屏 | 269.39 KiB | 73.64 KiB | 0 |
| 扩展示例首屏 | 274.75 KiB | 76.41 KiB | 71.53 KiB |
| 接近流程 / 时序图后 | 2573.18 KiB | 740.38 KiB | 71.53 KiB |
| 再打开灯箱后 | 2637.94 KiB | 759.14 KiB | 71.53 KiB |

共同外部 CSS 约 56.40 KiB；公式和扩展排版样式仅在对应 HTML 中输出。PhotoSwipe 的 JS / CSS 合并为首次打开才下载的约 18.76 KiB gzip 增量，普通页面不提前加载其 CSS。Mermaid 是较大的可选引擎，流程 / 时序场景约增加 664 KiB gzip；已按视口延迟加载，未将体积说成“零成本”。构建目录约 7 MiB 的 _astro 包含其他按需图表分块和字体，不等于首屏下载量。

## 验证边界

视频使用固定官方播放器来源与点击加载机制，跨域响应在浏览器测试中回放；未把回放宣称为真实平台播放、登录或地区限制验证。评论沿用真实 SDK + 受控 API，Giscus 的远程消息对端回放，未在远端发布评论。Google Fonts 使用保留 TLS 验证的 curl 缓存回放，没有关闭证书校验。仅实际验证 Chromium，Firefox / Safari 尚未实测。

[28 张实际截图](../screenshots/P31.md) · [可复制语法](../docs/MARKDOWN.md) · [配置参考](../docs/CONFIGURATION.md)

---

# P3.0 默认主题精修 · 0.5.0 · 2026-10-24

基于最新 main `06ae0a6`（P2.5 评论扩展合并结果），在 work 分支开发。环境仍为 Node.js 24.19.0、npm 11.9.0、Playwright 1.62.0、Chromium 154.0.8037.57；所有浏览器访问 Astro 生产静态产物，无生产 Node 服务。

- 配置 **33 / 33**、社交图标 **10 / 10**、评论 **23 / 23**，共 **66 项单测**通过。新增字体独立性 / CSS 注入拒绝、旧 home 配置兼容、真实品牌域名 / 仿冒域名区分、mailto / 普通网站及显式旧图标配置检查。
- Astro Check **0 errors / 0 warnings / 1 hint**（原有 execCommand 剪贴板降级）；默认生产静态构建成功。MDUI 仍固定 2.1.5，没有新增 npm 依赖、UI 框架或字体请求。主题版本 0.5.0；品牌 SVG 来自 Simple Icons 15.1.0，CC0 全文随许可文件分发。
- **P3 五套配置 × 桌面 / 触控手机 × 浅色 / 深色 = 20 组**：Default、Fresh、Minimal、自定义中英文品牌 / 平台链接 / 版权、无社交 / RSS / 搜索。四个 Tab 标题区域没有说明 / 眉题，搜索计数单独显示、清除后视觉隐藏但保留 live region；普通列表没有页码和到底提示。
- 实际读取原生 Tabs CSS Part：上方两角 **12px**、下方 **0px**，仍为 sticky 和原有轻量半透明 Surface。原生指示器 / Ripple / 状态层与内容面板动效继续由原实现处理。brandFont 的变量与实际站名 / App Bar 字体一致，字重 **650**；正文与文章标题字体未被覆盖。
- 自定义配置在 `/Nekomi/` 构建：GitHub / Bilibili 为真正的独立品牌 SVG，24×24、继承 currentColor；普通网站及邮箱使用已有 Material Icons。默认无个人平台账号，只自动显示 RSS。无社交、邮箱且 RSS 关闭时没有空 nav 或多余间距。
- 自定义 RSS 项与自动入口只显示一次，自动选用 RSS 图标；桌面和 Drawer 的链接实际点击后仅有 **一次 document 请求**并正确打开 application/rss+xml，没有 Astro 对 XML 的多余 fetch。默认页脚仅为动态 © 年份 / 站名，没有 RSS 或装饰文字；用户指定版权 / 文字 / 标签链接正确保留。
- 新界面检查首页 → 阅读 → 返回、Sidebar / Drawer / Wallpaper / timeOrigin 相同；空介绍不输出段落，阅读页无结束致谢，404 / 空友链 / 空文章用直接说明。默认站及两份预设示例不再包含移除的装饰性文案。少量 starter 文章依然诚实标明示例，保留 noindex 保护。
- **原六套配置 24 组**再次通过，含完整 Fresh / Minimal 示例、自定义字体 / 宽度 / 头像 / 统计、空文章及原个人站；不把主题的新默认覆盖到用户已有显式配置中。
- **原 P0–P2.4 的 18 组完整浏览器回归通过**：正文 / 原锚点 / 精确代码，目录弹簧与中断 / Hash / 历史 / 焦点，主题 / Tabs / Drawer，Shiki / Prefetch / 图片与失败回退，标题 / 封面正反向共享过渡 / 减少动效，八个视口与断点 / 两主题 / 极端壁纸对比度，Worker 和原 DOM / 图像 / 色板持久化。对比度抽测改查实际保留的首页标题，未删减其他覆盖。
- **根路径与 `/Nekomi/` 的 42 篇 / 七页完整回归通过**：SEO / Canonical / OG / JSON-LD / RSS / Sitemap / Robots，搜索远页 / 分类标签返回，精确滚动 / 首五帧 / 已加载批次，慢响应 / 503 重试 / 竞态取消，追加 Prefetch / 共享过渡。无 JavaScript 仍可经普通上一页 / 下一页遍历全部文章；移除页码后实际下一页地址仍正确更新，最后一批结束没有冗余加载或分页区域。
- **五种评论方式与九项边界场景通过**：Waline / Twikoo / Giscus / Artalk / Custom 的懒加载、主题 / 草稿、计数 / 最近、反复前进后退 / 清理、失败 / 重试 / 慢请求取消；关闭 / 空文章 / 稳定键 / 自定义超时 / 原生标题 Hash / 无能力降级 / 桥接文档 noindex 继续有效。保留上轮验证边界：真实 SDK + 受控 API，Giscus 远程讨论为消息对端回放，未实际登录或部署远端服务。

[38 张实际截图](../screenshots/P30.md)包括默认四个主 Tab、三个预设、自定义中英文站名及品牌图标、无社交配置、手机 Drawer 和阅读页。默认无壁纸；壁纸性能与明暗对比度由原回归使用项目自有截图回放验证，没有新增外部美术资源。

新增命令：

```sh
npm run test:social
python3 tests/p30_audit.py --screenshots
```

其他复测命令沿用下方 P2.5 / P2.4 记录，所有 Astro 构建顺序执行。README 的五段 JSON 配置示例另外实际解析并通过同一 Zod Schema 校验。

已知边界：仍保留原有剪贴板降级的弃用 hint；图标字体仍来自既有 Google Fonts。评论 OAuth / 云授权与线上域名部署不在本轮操作范围内。未发现阻塞 P3.0 的问题，没有进入 P3.1。

---

# P2.5 动态评论扩展 · 0.4.0 · 2026-10-24

基于 main `7b3b2bc`（合并通用配置版 P2.5），在 work 分支继续。Node.js 24.19.0、npm 11.9.0、Python Playwright 1.62.0、Chromium 154.0.8037.57。浏览器访问 Astro 生产静态产物，Python 只托管文件，不需要 Nekomi Node 后端。

- **配置 31 / 31、评论 23 / 23 单测通过**：关闭默认、服务必填项、公开 URL / 禁止凭据与管理字段、非法 URL / 查询参数、模块路径、时间预算、稳定键 / 旧路径 / 中文与版本 SRI。
- **五种适配 × 根路径 / `/Nekomi/`** 的浏览器功能及失败组通过。每组包含桌面 1440×900 与真正的 Android 触控上下文 390×844（另检查 320×700 及嵌入文档内部溢出）、明暗切换、真实 SDK 注册 / UI、视口懒挂载、计数、最近能力、另一篇 / 反复历史导航、旧容器断开、公共 DOM / timeOrigin 相同。主题切换不重建编辑器，Waline / Twikoo / Artalk 已输入草稿仍在。
- Waline 3.16.1、Twikoo 2.0.17、Artalk 2.10.0 加载真实固定版本 JS / CSS，浏览器执行 SRI 校验；只回放公开服务 API。Giscus 执行真实官方 client.js / default.css，远程讨论 UI / metadata 对端是测试模拟，**不冒充实际 GitHub OAuth / Discussions 验证**。Custom 执行完整只读 REST 示例模块。
- SDK 503 → 失败 → 重试成功；最近 API 503 重试；扣留响应时切换页签 / 文章后取消；旧计数 99 不覆盖新文章的 1；空服务计数为真实 0、Giscus 无 metadata 时隐藏而非伪造 0；无旧 iframe、重复 UI 或 pageerror。
- **九项边界场景**：本地评论运行 chunk 503 时搜索 / 原生主题按钮 / 导航继续工作，刷新重试恢复；counts/recent 关闭后不发额外请求；服务关闭无评论 UI、SDK、API、本地 controller / frame 请求；单篇关闭同时覆盖动态服务和旧 link / 演示预览入口；零文章；跨 base / 改 ID / 显式旧键；无 recent / count 能力；不协作取消的 mount 超时后迟到也销毁且不发布 999。普通文章标题即使以 comment- 开头也不被接管；具体评论同页 Hash 通过原有列表历史状态记录，“返回文章列表”不会多退 / 少退。
- 额外临时正式文章构建验证桥接文档 noindex，且不进入 Sitemap / RSS；重复线程键与缺失自定义模块均按预期构建失败。所有临时文章 / 模块位于 .astro，不作为默认内容提交。
- 最近侧栏只在实际打开时加载，两端复用当前服务、60 秒成功缓存；Giscus SSR 隐藏不支持的 Tab，Custom 无能力给出说明。未知 / 草稿 / 关闭评论文章过滤。恶意最近内容的 img / script 不执行，也没有跟踪像素请求；使用 inert 文本提取、textContent 和 HTTP(S) 头像约束。
- 独立壁纸配置下再次验证首页 → 文章 → 另一篇 → 前进后退 → 首页，共享壁纸 / 图像 / Sidebar DOM 和 timeOrigin 不变；评论区在离页前销毁，不改变原持久化 Swap。
- **原六套配置 × 四种视口 / 主题 = 24 组**重新通过：Default、Fresh、Minimal、自定义配色 / 字体 / 宽度 / 头像 / 壁纸 / 统计、空文章、原个人配置。关闭目录 / 复制 / 搜索 / 相邻导航 / 无限滚动 / 分类标签等开关继续影响真正的 SSR 和行为，根域 / 子路径输出正常。

- 原 P0–P2.4 的 **18 组完整浏览器回归重新通过**：旧十篇正文 / 稳定锚点 / 精确代码，主题 / Tabs / Drawer / 焦点，Shiki / 图片 / Prefetch，目录弹簧 / Hash / 历史，标题 / 封面正反向共享过渡与减少动效，八个视口 / 断点 / 对比度，Worker / 图像持久化 / 失败降级，临时长标题 / 六级目录 / 图片与封面。旧样例输入仍来自 examples/personal，不缩减测试以迁就默认两篇入门文章。

- P2.4 **根路径与 `/Nekomi/` 的 42 篇 / 七页临时文章完整套件重新通过**：SEO / Canonical / OG / JSON-LD / RSS / Sitemap / Robots / demo 索引控制，精确返回滚动 / 首五帧、保留批次与筛选，连续阅读加 Hash，全站远页搜索、分类标签返回，慢响应 / 503 / 竞态取消，追加 Prefetch / 共享元素；禁用 JS 仍能通过真实分页遍历全部文章。
- 最终 Astro Check **0 errors / 0 warnings / 1 hint**（原有 execCommand 剪贴板降级）；生产静态构建成功。没有新增 npm 依赖，固定 Astro / MDUI 版本不变；许可与第三方远程 SDK 清单已更新。默认浏览器五个公共 JS 请求，不请求可选评论 chunks，体积详见 [ASSET-SIZES](ASSET-SIZES.md)。

[20 张实际评论截图](../screenshots/P25-COMMENTS.md)覆盖五种接入方式的桌面 / 手机浅深模式。截图留言明确为回放数据；SDK 头像回放仅使用项目自己的界面截图。通用主题 / 首页 / 预设图集仍见 [P25](../screenshots/P25.md)。

主要命令（Astro 构建顺序执行）：

```sh
npm run test:config
npm run test:comments
npm run check
npm run build
python3 tests/comments_audit.py --stress --screenshots
python3 tests/comments_audit.py --base /Nekomi/ --stress
python3 tests/comments_audit.py --providers waline --wallpaper
python3 tests/comments_edges.py
python3 tests/theme_audit.py
python3 tests/browser_audit.py --dist .astro/p25-tests/personal/dist --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn
python3 tests/browse_audit.py --fixture
python3 tests/browse_audit.py --fixture --base /Nekomi/
```

边界：未代用户部署评论后端，没有实际登录 / 发表评论 / 审核 / 发送邮件，真实 GitHub OAuth、腾讯云资源授权和各平台生产 CORS / 隐私策略需在自己的部署验证。内置服务不宣称逐条评论定位能力；Giscus 不支持全站最近查询。图标字体仍来自 Google Fonts；评论服务与外部统计默认关闭。接入与安全见 [COMMENTS](../docs/COMMENTS.md)，自建契约见 [COMMENT-ADAPTERS](../docs/COMMENT-ADAPTERS.md)。

---

# P2.5 通用配置版 · 0.3.0 · 2026-10-23

基于最新 main `f798f79`，在 work 分支开发，主题版本 0.3.0。Node.js 24.19.0、npm 11.9.0、Playwright 1.62.0、Chromium 154.0.8037.57；浏览器均访问生产静态产物，Python 文件服务器托管，没有生产 Node 服务。

- 配置单测 **31 / 31** 通过。校验嵌套默认值、预设覆盖、无输入变异、示例配置、未知键、重复模块、危险 URL / CSS、尺寸范围、无效源站 / base / 语言、统计依赖、null 输入；支持带点仓库子路径。
- 最终 Astro Check **0 errors / 0 warnings / 1 hint**；唯一 hint 为原有 document.execCommand 剪贴板降级。默认生产构建成功，仍固定 Astro 7.4.2 / MDUI 2.1.5；没有新增前端框架或客户端配置校验依赖。
- **六套配置 × 桌面 / 手机 × 浅色 / 深色 = 24 组**真实浏览器场景全部通过：默认、Fresh、自定义个人站、Minimal、自定义配色 / 字体 / 1360 页面 / 280 侧栏 / 720 阅读宽度 / 壁纸 / 统计 / 评论接口、无文章。原个人站使用原十篇示例，新用户默认只含两篇明确标识的入门样例。
- 不仅比对 JSON，还断言浏览器计算样式中的实际字体、标题字体、圆角、页面 / 侧栏 / 阅读宽度。修复 Astro 打包 CSS 后置覆盖用户样式的问题：配置 Token 现在放在根元素，与持久化色板一同保持；组件仍使用公开变量和 CSS Parts。
- Minimal 关闭目录、复制、头图、元信息、上下篇、阅读动效、搜索、RSS / Sitemap、自动加载、分类 / 标签及侧栏 Tabs；实际没有对应控件 / 目录观察器，/ 键不会误开 Drawer，标题锚点立即定位，静态分页保留。
- 自定义配置使用独立 `/Nekomi/` 构建：头像优化、三侧栏 Tabs 顺序 / 评论、内部自定义导航的 base、评论真实外链、单篇作者 / 更新日期 / SEO 描述、草稿排除、全局与单篇阅读覆盖通过。旧日期置顶不改变文章相邻导航的时间顺序；RSS 和月份归档继续按时间。
- 可选 Umami 用本地回放脚本验证：首页 → 文章 → 另一篇 → 后退 → 列表始终只执行一次。修复了 data-astro-rerun="false" 仍被 Astro 当作启用的属性问题；生产默认根本不输出统计脚本。没有实际向统计或评论服务提交数据。
- 无 JavaScript 检查首个启用的侧栏面板（包括 Fresh 的友链优先）、自定义导航真实备用链接；去掉了旧 CSS 对 updates 面板的硬编码。空文章构建 / 主空状态 / 手机 Drawer / 主题切换无异常。
- 原 P0–P2.4 **18 组完整回归全部通过**：内容 / 稳定锚点 / 原代码、剪贴板 / Shiki / 图片 / Prefetch、Tabs / Drawer / 焦点 / 主题、弹簧中断 / Hash / 历史、共享元素 / 减少动效、Worker / 壁纸 DOM 与图像持久化、失败 / 无存储降级、所有原有响应式与对比度。旧套件明确指向 examples/personal + examples/demo-posts；没有删减覆盖来适应两篇新入门内容。最后另复跑八个要求视口及 1119 / 1120 / 1439px 边界的明暗布局。
- P2.4 根路径及 `/Nekomi/` 的 **42 篇 / 七页临时文章**完整回归通过：搜索覆盖远页、分类 / 标签返回、精确滚动与前五帧、批次保留、追加不跳动、503 手动重试、竞态取消、追加卡片 Prefetch / 共享过渡；禁用 JS 可经真实链接遍历全部文章。最终统一发布校验后再次复测两种路径 SEO。
- Canonical / OG / X / JSON-LD、可选分享图、真实更新日期、RSS、Sitemap、Robots 与 demo noindex 策略通过。示例不被误当作站长真实文章，draft 不进入任何公开出口；默认未配置域名，不编造正式 Canonical，空 RSS / 无 Sitemap 是预期行为。
- 六套配置的页面切换中，wallpaper / sidebar / drawer 对象及 timeOrigin 保持相同；启用壁纸时图像也是同一个对象。没有 JS 控制台异常或横向溢出。

真实图集见 [P25](../screenshots/P25.md)。新截图默认不带外部壁纸，自定义图片回放来自本项目原界面截图；没有新增动漫 / 插画素材。测试大量文章、草稿、评论、外链与统计脚本只在 `.astro/p25-tests/` 或临时构建内，不加入正式文章。

开源检查保留主题 MIT，生成 18 个浏览器依赖的许可文本（静态产物随附 THIRD-PARTY-LICENSES.txt），记录构建图片依赖 LGPL / MPL 条款；测试、examples、screenshots 源目录不进入产物。README、配置 / 内容 / 图片 / 迁移 / 部署 / 贡献文档及 Issue / PR 模板齐全。GitHub Template 开关、DNS 与线上 Pages / Cloudflare 项目仍需维护者按文档配置；本轮验证静态根域 / 子路径产物，未执行线上部署。

边界：评论目前支持真实外链与构建期数据接口，不提供嵌入式后端；图标字体仍来自 Google Fonts，可按许可自行托管。用户 Markdown 支持原始 HTML，适用于受信任内容；统计默认关闭。未发现阻塞本轮交付的问题。

---

# P2.4 实际验证结果 · 2026-10-23

基于最新 main `ab8db7f`（P2.3 合并结果），在 work 分支开发。Node.js 24.19.0、npm 11.9.0、Playwright 1.62.0、Chromium 154.0.8037.57。所有浏览器测试均访问生产静态产物，由 Python 文件服务器托管，不运行 Astro / Node 服务。

- **Astro Check：0 errors / 0 warnings / 1 hint**；保留旧式剪贴板降级的弃用 hint。生产构建成功，MDUI 仍固定 2.1.5，Astro 7.4.2 不变，新增官方 Sitemap 3.7.4 / RSS 4.0.19 只在构建时运行。
- 原 P0–P2.3 **18 组完整浏览器回归通过**，覆盖内容摘要 / 全部原标题锚点 / 原代码、组件 / 焦点 / Drawer / 三态主题、图片 / 失败回退 / Shiki / Prefetch、弹簧与共享元素、八个视口及断点、明暗 / 极端壁纸对比度、Worker 及原位持久化。最终异步搜索焦点和导航表面调整后，另单独复测 home、mobile、motion、reader。快速目录重定位改为同一事件周期内的两个原生点击，确定发生在弹簧运行中，避免短动画状态轮询的瞬时漏采。
- **根路径及 `/Nekomi/` 的 42 篇临时文章测试均通过**：原十篇加临时 32 篇，共七页、每页六篇。每个分页能直接访问，首页源码只有六张 Card；实际关闭 JavaScript 遍历全部 42 个不同文章 URL，真实下一页 / 上一页及分类 / 标签替代入口可用。正式文章文件未增加或改写。
- 滚动接近底部才读取后续 HTML，七页各请求一次，没有闲置预读全部页。扣留响应并快速重复滚动只有一个请求；503 后不循环重试，原生按钮重试成功、无重复 Card；追加不改变 scrollY，手动加载的键盘焦点落到首个新标题。连续加载后页码显示已加载范围，下一页不重复已加载批次。
- 全量元数据搜索能发现第六页的唯一关键词，不依赖已加载 DOM；输入合并网络请求，慢响应 / 查询更换 / 离页后旧结果不会覆盖新页。桌面和手机均验证搜索 / 清除 / 高亮 / 查询 URL / 返回，文章页按 Enter 搜索远页结果时会等待卡片出现再聚焦。
- 列表 → 文章从顶部阅读；浏览器后退、前进、来源返回按钮、连续两篇文章加章节 Hash 后返回，均还原批次与位置。采样返回后前五帧，没有先显示顶部再跳回。分类 Tab 预览、独立分类 / 标签列表及搜索结果返回均保留上下文；直接打开文章保留普通首页回退。录屏实测桌面 **1641 → 1641px**、手机 **1800 → 1800px**，各保留 18 篇。
- 位置由 Astro 原生历史恢复；本轮修复的是 MDUI 插槽异步渲染导致恢复被短页面截断。Swap 前还原列表、面板与临时 main 高度，组件更新后解除占位，不重写路由系统。八份有界列表缓存与 sessionStorage 辅助缓存以内容 / 配置版本隔离；公共侧栏、Drawer、壁纸与主题保持原位。
- SEO 校验覆盖唯一 Title / Description、Canonical 自引用、OG / X、可用图片 / 无图、语言、作者、真实修改日期 / 未填写日期、WebSite / Blog / BlogPosting。原示例文章 noindex、不进入 RSS / Sitemap / 真实 BlogPosting；某张分页只有示例时也不收录。启用临时发布配置后，RSS 仅含 32 篇非 demo，Sitemap 与最终 HTML robots 一致，lastmod 只取明确日期。根 / 子路径的绝对和相对 URL、优化分享图、Sitemap 引用正确。
- 默认未配置正式域名：Canonical / og:url 不虚构，默认示例不收录，RSS 为空、Sitemap 不生成、robots 不引用不存在的文件。临时自定义域名为保留示例地址 `https://nekomi.example`，不代表 Nekomi 已部署到该域名。
- “全部文章”用于主 Tab、标题与恢复状态，“最近更新”侧栏不变；旧 Hash 兼容。Tabs 圆角、半透明 Surface、3px 轻量模糊保留原生指示器、状态层与吸顶位置。1440 / 1360 / 1359 / 1280 / 1024 / 960 / 390 / 320px 与原断点回归无横向溢出、目录重叠或阅读宽度回退。
- SPA 过程仍为一个 document 请求；禁用 Worker 时，壁纸 DOM / 图像 / 公共外壳 / MDUI 构造器 / 色板及 timeOrigin 保持同一个对象，一次 API 请求与显式解码。新追加卡片的 Prefetch 与标题共享过渡也在真实浏览器中验证，不执行抓取分页中的公共初始化脚本。

[实际截图与两段正常速度浏览录屏](../screenshots/P24.md)包括桌面 / 手机、浅色 / 深色、默认首页 / 阅读页 / 目录及临时大列表的进入前 / 返回后对照。背景来自此前实际 HTTP 获取并检查的 API 原始图片回放，未生成素材。[体积报告](ASSET-SIZES.md)明确区分 JS / CSS、HTML 与构建期集成；新增 SEO 库不进入客户端。

主要命令：

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run build
python3 -u tests/browser_audit.py --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn --artifacts /tmp/nekomi-p24/regression
python3 -u tests/browse_audit.py --artifacts /tmp/nekomi-p24/default
python3 -u tests/browse_audit.py --fixture --artifacts /tmp/nekomi-p24/large-root-final
python3 -u tests/browse_audit.py --fixture --base /Nekomi/ --artifacts /tmp/nekomi-p24/large-subpath-final
# 最终索引边界与页码范围修正后另复测 root / subpath 的 --only-seo / --only-loading
```

仅实测 Chromium，Firefox / Safari 尚未实测。云环境字体响应通过保持代理和 TLS 校验的 curl 获取后回放；没有关闭证书验证。正式上线需配置真实 SITE_URL、发布开关并替换 demo 数据；子路径的 robots 还需由站长合并到域名根 `/robots.txt`，项目仓库不能修改外部根站点。没有新增评论后端、后台、常驻 Node 服务或下一阶段功能。

---

# P2.3 实际验证结果 · 2026-10-23

基于 `work` 分支的 P2.2 `b682539`（与本轮开始时最新 main 合并结果的文件内容一致）。Node.js 24.19.0、npm 11.9.0、Playwright 1.62.0、Chromium 154.0.8037.57。浏览器访问生产静态构建，由 Python 静态服务器托管。

- `astro check`：**0 errors / 0 warnings / 1 hint**；hint 是保留的旧式剪贴板降级。根路径 `/` 与子路径 `/Nekomi/` 构建成功，各 **18 组完整回归通过**。
- 不只读取 CSS：浏览器探针记录真实 `::view-transition-group(post-title)` / `post-cover` 动画，断言唯一配对、500ms 时长、官方 spatial 曲线以及实际几何变化。覆盖桌面 / 手机、浅色 / 深色、标题键盘导航、有封面点击、返回、浏览器前进后退。标题改为单份文字快照，避免不同字号双层淡入造成重影。
- 封面临时配置构建检查真实 Astro WebP / srcset；拦截并持续扣留目标大图，180ms 预算后正常进入文章，仅衔接标题，503 后保留头图缺失回退。另在预热解码尚未完成时切换减少动效，等待会及时解除，名称清理，导航继续完成。
- 生产 WAAPI 实际时长为 **350 / 200ms**。修复 Vite 将 `350ms` 压成 `.35s` 后旧解析造成的千倍缩短；Tabs 原生指示器仍有独立非零过渡，面板扩展不重写原生指示器。卡片 Hover 无 3px 上浮，只做轻微缩放 / 形状 / 原生 Elevation 反馈。
- 目录原生 List Item 的 active / 实际链接 aria-current 与章节同步；真实 `transitionrun` 检查标记连续移动及最终几何位置。原弹簧的轮滚 / 触摸中断、重复定位、精确偏移、Hash / 历史 / 焦点、先关闭原生折叠再定位均通过。
- 减少动效：无共享命名、不运行自定义进入，组件 / 标记 / View Transition 缩至 1ms，滚动立即完成。页面加载中连续导航、动画进行中立即反向导航，均不会留下名称、丢失配对或拒绝的 View Transition。禁用原生 API 的新文档仍可使用 Astro fallback 无刷新导航。
- 禁用 Worker 的跨页回归保持同一个壁纸容器、图像、公共外壳、组件构造器及色板对象；一次 document 请求、一次 API 请求、一次显式解码。另覆盖待加载背景导航、真实 Worker 缓存 / 作用域 / 刷新复用和加载失败回退。
- P0 / P1 / P2.1 / P2.2 回归覆盖搜索与高亮 / 空结果、分类 / 标签 / 归档、侧栏三个 Tabs、Drawer / Dialog 焦点与关闭、三态主题、选择性 Prefetch、Shiki、优化图片 / 失败回退、代码复制、直接访问 / 刷新 / 静态 404 / 旧链接。没有发现重复组件注册、重复响应或页面 JS 异常。
- 1440×900、1360×900、1359×900、1280×800、1024×768、960×720、390×844、320×700，以及 1119 / 1120 / 1439px 边界，明暗 / 无壁纸表面及独立长标题 / 六标签 / 封面 fixture 通过。保留 P2.1 的正文行宽、1.85 行高、1.25em 块间距、1120 / 1440px 断点和 P2.2 的手机 App Bar 16px 间距，无横向溢出或目录重叠。原极端黑白壁纸指定文字区域对比度抽测仍不低于 4.5:1；不是全组件 WCAG 认证。
- 首页及十篇公开文章检查不再出现阶段 / 原型提示，保留“小林的小窝”“分享技术、日常”。所有文章仍保留可替换 demo 字段；不增加友链 / 评论或冒充站长实际经历。原历史正文基线没有覆盖，新文案摘要和明确的标题 / 代码调整单独存放，所有稳定章节 ID 与层级仍逐项比对。

[24 张实际截图与 4 段正常速度录屏](../screenshots/P23.md)包含默认无封面及临时配置封面的首页 / 阅读页 / 目录，桌面与手机各两种主题。背景回放此前实际 HTTP 获取并审核的 API 原始响应，素材未生成；封面使用本项目截图。公开配置和文章不因测试 fixture 增加图片或示例社交关系。

[设计依据与原生 / 扩展分工](../docs/MOTION.md)：采用官方 Spatial / Effects 分离、适量空间超调、语义色与对应 on 色、单层状态反馈及原生 Elevation。Ripple、控件状态层、Tabs 指示器、Drawer / Dialog / Collapse 继续由 MDUI 2.1.5 处理；Nekomi 只扩展共享元素、页面 / 面板内容、目录标记和轻量卡片反馈。不引入依赖，不改变壁纸呈现或布局。

主要命令：

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run build
python3 -u tests/browser_audit.py --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn --artifacts /tmp/nekomi-p23/root
ASTRO_TELEMETRY_DISABLED=1 SITE_BASE=/Nekomi/ ASTRO_OUT_DIR=.astro/p23-subpath ASTRO_CACHE_DIR=.astro/p23-subpath-cache npm run build
python3 -u tests/browser_audit.py --dist .astro/p23-subpath --base /Nekomi/ --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn --artifacts /tmp/nekomi-p23/subpath
# 最终标题单快照与预热取消修复后，另复测两个部署路径的 motion / covers 用例
python3 -u tests/browser_audit.py --only motion --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn
python3 -u tests/browser_audit.py --only covers --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn
```

仅实测 Chromium，Firefox / Safari 尚未实测。Google Fonts 通过保留代理与 TLS 校验的 curl 获取原始响应后回放，MDUI 使用真实本地构建产物。封面共享只在目标图片及时可用时启用，文章之间 / 不可见标题走普通页面过渡；这是有意的渐进增强。保留旧式剪贴板 hint；未进入 P2.4。

---

# P2.2 实际验证结果 · 2026-10-23

基于 P2.1 `22ca40e`。Node.js 24.19.0、npm 11.9.0、Playwright 1.62.0、Chromium 154.0.8037.57。浏览器访问生产构建，只有 Python 静态服务器，没有运行 Astro / Node 服务。

- `astro check`：**0 errors / 0 warnings**；保留旧式剪贴板降级的 1 条弃用 hint。
- 根路径 `/` 与子路径 `/Nekomi/` 生产构建正常；各 **15 组**完整浏览器检查通过。另对最终头像尺寸 / 裁切及其加载失败状态复测配置 fixture。
- 固定 npm `mdui@2.1.5`，逐项导入 20 种实际组件、两个主题函数与官方 CSS。未请求 unpkg，没有 `window.mdui` 或未使用 Slider 注册；多轮导航后组件构造器不变，无重复注册异常或主题事件重复响应。
- 首页 → 技术文章 → 下一篇 → 首页及四轮往返：首次一个 document 请求，壁纸 API 一次请求、一次显式解码，壁纸容器 / 图像 / 公共外壳 / 主题 / 色板对象保持相同。真实 View Transition 仍运行，根画面不淡入；待加载图像导航、Worker 作用域 / opaque 缓存 / 刷新复用及失败回退均通过。
- 原生 List 目录：桌面及折叠模式、原生 active 与 aria-current、H2–H6 深度、长标题换行；滚轮 / 触摸中断与重复跳转、精确 28px / 84px 标题偏移、Hash / 刷新 / 前进后退、键盘焦点、减少动效通过。手机点击后先等原生 Collapse 的 closed，再执行弹簧，避免布局变化造成偏移。
- 手机 / 紧凑导航阅读容器与 App Bar 的实际间距 **16px**，首页不变；直接访问、客户端导航和历史均覆盖。1440 / 1360 / 1359 / 1280 / 1024 / 960 / 390 / 320px 及 1119 / 1120 / 1439px 边界 × 明暗 / 无壁纸表面，通过无横向溢出、目录不重叠和原 P2.1 行宽 / 间距检查。
- Astro Image：配置 fixture 中的站点 / App Bar / 友链头像、封面与头图生成 WebP、响应式候选和固有尺寸；原正文 HTML figure 与标准相对 Markdown 图片均优化。原 PNG 161,080 字节，对应 320–1440px WebP 为 5,208–58,232 字节。生成资源返回 404 时，头像文字 / 封面收起 / 头图收起 / 正文说明仍生效（含 App Bar 隐藏克隆）。随机背景未进入构建优化。
- Prefetch：闲置页面不预取全部文章；标题 hover、重复 hover、同篇 MDUI 阅读按钮去重、相邻原生 Card hover 通过。使用 Astro 内置低优先级预取与网络节流条件，不自写页面 fetch 缓存。
- Shiki：CSS / JavaScript 等围栏实际产生多色 token，浅色 / 深色 / 跟随系统颜色正确；没有重复代码包装。十篇正文文本 SHA-256、全部原标题与代码精确比对通过，真实剪贴板复制通过。
- 首页 Tabs / 搜索 / 分类 / 标签 / 归档、侧栏三个 Tabs、Drawer / Dialog 原生焦点与关闭、三态主题、静态 404 和旧链接回归通过。极端黑白壁纸上的指定文字区域仍通过 4.5:1 对比度抽测；这不是全组件状态的 WCAG 认证。

[18 张实际截图](../screenshots/P22.md)包含 390px / 320px 文章顶部与展开后的原生目录、桌面右目录、明暗 Shiki 和首页回归。背景为此前实际 HTTP 获取并检查过的 API 原始样本，浏览器回放同一响应以便比较；没有生成素材。配置 fixture 只修改临时副本，不修改生产文章、默认配置、P2.1 Tokens 或壁纸 Worker。

[构建体积与口径](ASSET-SIZES.md)：含迁移前远端 MDUI 的 JS / CSS 原始合计 **452,488 → 309,611 字节（−31.58%）**，逐文件 gzip 估算 **107,166 → 79,161 字节（−26.14%）**。Shiki 增加构建后的文章 HTML token 标记，无客户端高亮 JS。

主要命令：

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run build
python3 -u tests/browser_audit.py --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn --artifacts /tmp/nekomi-p22/root
ASTRO_TELEMETRY_DISABLED=1 SITE_BASE=/Nekomi/ ASTRO_OUT_DIR=.astro/p22-subpath ASTRO_CACHE_DIR=.astro/p22-subpath-cache npm run build
python3 -u tests/browser_audit.py --dist .astro/p22-subpath --base /Nekomi/ --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn --artifacts /tmp/nekomi-p22/subpath
```

仅实测 Chromium，Firefox / Safari 未实测。云代理中的外部 Google Fonts 响应由保持 TLS 校验的 curl 获取后回放；MDUI 使用真实本地构建产物。既有的 `execCommand` 剪贴板降级 hint 保留。没有发现本轮验收范围内尚未修复的功能问题；未进入 P2.3。

---

# P2.1 实际验证结果 · 2026-10-23

基于 `ec0f428`（P2 main）完成排版精修，浏览器为 Chromium 154.0.8037.57，Node.js 24.19.0、npm 11.9.0、Playwright 1.62.0。通过 Python 静态服务器测试构建产物。

- 全量 **13 组**浏览器回归通过：原有导航、搜索、主题、侧栏、Drawer、目录、复制、内容完整性、Worker、失败回退及新增排版 / 表面 / 元数据 fixture。
- 指定 **8 个视口**全部检查首页与阅读页的明暗模式、壁纸与无壁纸表面；额外验证 1119 / 1120 / 1439 / 1440px 的切换边界，无页面横向溢出或目录重叠。
- 独立 Content Collection 副本构建有封面 / 头图、长标题六标签、无标签 / 演示说明等状态；图文顶端对齐，320×700 的长标题与六标签完整显示，首屏仍有正文。生产文章、代码和默认 frontmatter 未修改。
- 黑 / 白极端壁纸按浏览器实际计算色和透明度进行合成，抽测侧栏文字、选中 Tabs、日期、首页摘要、正文 / 链接与右目录，最小文本对比度 **4.53:1**；390px 手机抽测最小值 **6.05:1**。这是指定文字区域的验证，不是全组件状态的 WCAG 认证。
- 禁用 Worker 连续导航，仍为一次 document 请求、一次 API 请求、一次显式解码；壁纸容器与图片保持原对象，不再次淡入。新增阅读表面配置在客户端导航后保留。
- `astro check` 仍只有旧式剪贴板 fallback 的 1 条弃用 hint（0 errors / 0 warnings），保留其降级能力。静态构建正常，MDUI 仍为固定的 unpkg 2.1.5。

| 视口 | 正文可用宽度 | 正文首段距视口顶端 | 目录 |
| --- | --- | --- | --- |
| 1440×900 | 696px | 353px | 右侧 |
| 1360×900 | 696px | 424px | 折叠 |
| 1359×900 | 696px | 424px | 折叠 |
| 1280×800 | 696px | 424px | 折叠 |
| 1024×768 | 696px | 453px | 折叠，App Bar |
| 960×720 | 696px | 453px | 折叠，App Bar |
| 390×844 | 318px | 423px | 折叠 |
| 320×700 | 248px | 415px | 折叠 |

表中为原始技术演示文章。1360px 正文由上一版 648px 恢复到 696px，1024px 由 592px 增至 696px；390px 正文由约 494px 提前到 423px。1360px 增加折叠目录所需的纵向空间，换取完整行宽；没有为了首屏高度裁切文章标题。

25 张实际浏览器截图见 [图集](../screenshots/P21.md)，含代码、宽表格与正文图片；背景沿用已实际请求并审核的 API 原始图片，封面是本项目截图。正文行高 1.85、块间距 1.25em、H2 上间距 1.85em；侧栏 / Drawer 切换为 1120px，右目录为 1440px。完整参数见 README。

验证命令：

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run build
python3 -u tests/browser_audit.py --chromium /usr/bin/chromium \
  --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn --artifacts /tmp/nekomi-p21/final
```

云环境 CDN 仍由保持 TLS 校验的 curl 获取原始响应后回放；没有修改 CDN 或关闭证书验证。未实测 Firefox / Safari。超出示例规模的任意长标题 / 标签仍自然换行，不做截断，可能占用超过一屏；随机图片池后续内容与可用性由 API 控制。

---

# P2 实际验证结果 · 2026-10-23

环境：Node.js 24.19.0、npm 11.9.0、Python Playwright 1.62.0、系统 Chromium 154.0.8037.57。构建产物由 Python 静态文件服务器提供，不运行 Astro / Node 服务。

| 检查 | 结果 |
| --- | --- |
| `npm run check` | 0 errors、0 warnings；1 条旧式剪贴板 fallback 的弃用 hint，保留其降级能力 |
| `npm run build` | 成功；首页、十篇独立文章、404，以及兼容用的 `article.html`；无服务器 adapter / server 产物 |
| 根路径全量浏览器回归 | 全部 11 组通过，无意外 JavaScript 异常 |
| `/Nekomi/` 子路径回归 | 全套通过（除额外配置构建）；静态 URL、图片、客户端导航与 Worker 作用域正确 |
| 内容迁移 | 十篇正文文本 SHA-256、稳定标题 ID / 层级、代码逐篇比对迁移前基线通过 |
| 视觉 | 1440 / 1024 / 861 / 860 / 390 / 320px，首页 / 阅读页、浅色 / 深色检查通过，无页面横向溢出 |
| 填充配置 | 七项友链 / 四条演示评论、完整 Dialog、Drawer 焦点、坏头像及有效头像、短屏三 Tabs 通过 |

根路径实测命令（云环境禁用遥测配置写入）：

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run build
python3 -u tests/browser_audit.py --chromium /usr/bin/chromium \
  --verified-cdn --cdn-cache /tmp/nekomi-p11/cdn --artifacts /tmp/nekomi-p2/final-root
```

子路径使用 `SITE_BASE=/Nekomi/` 构建后，以 `--base /Nekomi/ --skip-fixtures` 执行相同浏览器检查。填充配置另在根路径构建验证，并已在修复 App Bar 内复制头像的错误事件后重新全量通过。

## 壁纸持久化证据

禁用 Service Worker，执行首页 → 文章 → 下一篇 → 首页，再重复四次首页 / 文章往返：

- 只有初始 **1 次 document 请求**，内部页面使用 ClientRouter fetch；performance.timeOrigin 不变。
- 壁纸容器、图像、公共侧栏、Drawer、主题单例、MDUI 和色板均严格为原对象。
- 随机 API **1 次请求、1 次显式 decode**；后续没有新 load、移除淡入状态或重新淡入。
- 原生侧栏选项保留，连续导航后主题按钮单次点击只切换一个模式，路由播报节点不积累。
- 浏览器 ViewTransition.ready 后实际采样到正文 `nekomi-in`，根画面没有交叉淡入。
- 背景仍在请求中时导航，保留原加载任务与容器，响应到达后只解码一次。

另开启真实 Worker，验证 scoped `wallpaper-cache.js`、opaque 缓存响应与刷新复用：刷新后仍只有一次 API 请求。这是独立于 DOM 持久化的辅助缓存验证。

## 阅读与回归

Tabs / 键盘 / ARIA / Hash、搜索 / 分类 / 标签 / 空结果 / URL 恢复、原生 MDUI 链接、默认及筛选首页返回、直接文章 URL、刷新、锚点和前进后退、弹簧中断 / 重定位 / 偏移、移动 Collapse、减少动效、代码剪贴板、图片 / 表格 / 长代码溢出、404、Drawer / App Bar、三态主题 / 系统 / 存储受限，均通过。

关闭 JavaScript 后静态 HTML 仍含完整文章、元数据、代码和目录；导航增强与复制按钮需要 JavaScript。

## 实际截图与录屏

八张首页 / 文章的桌面 1440×900、手机 390×844 明暗截图及约 19 秒导航录屏，见 [README 图集](../README.md)。截图沿用 P1.1 的实际 API 原始样本，通过 Chromium 实际加载解码；录屏额外校验全过程一个 document 请求、壁纸 / 图片对象不变，未冻结动画。

自动化回归使用本项目截图作为确定性图片 fixture。云环境以保持 TLS 校验的 curl 获取原始 CDN 响应后回放；未修改 CDN、关闭证书校验或调整信任库。尚未验证 Chromium 原生 CDN 证书链，也未实际测试 Firefox / Safari。
