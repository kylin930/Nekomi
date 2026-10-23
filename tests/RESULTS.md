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
