# P2–P2.4 静态构建浏览器回归

## v1.0.0 个性化审计

```sh
node --test tests/config.test.mjs tests/social.test.mjs tests/comments.test.mjs tests/reading.test.mjs tests/personalization.test.mjs
npm run check
npm run build
python3 tests/personalization_audit.py --screenshots
```

`personalization_audit.py` 构建默认、中文个人站、英文通用站三套配置，检查桌面 / 手机 × 明暗共 12 组；覆盖首页 / 阅读 / 分类 / 标签 / 归档、侧栏命名、日期 / 时区、分类角色及 ≥4.5 对比度、空 / 旧分类标识、预览数量、字体、普通顶部链接、真实 SSR 链接及单次解析元数据。子路径为 `/Journal/`，同时验证普通页面与文章的 ClientRouter 导航；评论使用只读示例适配器和受控 API，不发布真实留言。

临时文章和 KaTeX MIT 字体仅放在被忽略的 `.astro/p25-tests/` 产物，不写入主题文章或 public。实际截图见 [screenshots/PERSONALIZATION.md](../screenshots/PERSONALIZATION.md)，配置与剩余范围见 [个性化指南](../docs/PERSONALIZATION.md)。

兼容回归继续使用下方 release / reading / comments / theme / browse 套件。`publishing.language` 不自动翻译 UI；测试通过显式 UI 配置验证英文，并对仅改 language 的情况保留中文默认值。

依赖 Node.js 24 / npm（构建）、Python 3、Playwright 1.62.0 和 Chromium（浏览器验证）。构建完成后，测试仅用 Python 文件服务器提供 `dist/`，不是 Astro dev / preview，也不需要生产 Node 服务。

```sh
npm ci
npm run check
npm run build
python3 -m pip install -r tests/requirements.txt
# 使用系统 Chromium；也可自行安装 Playwright Chromium
python3 tests/browser_audit.py --chromium /usr/bin/chromium --artifacts /tmp/nekomi-browser
```

应用使用本地 Vite 构建的 npm MDUI 2.1.5，测试明确断言没有 unpkg 请求、没有 window.mdui 或未使用的 slider 注册。外部网络只涉及 Google Fonts 和随机壁纸；云代理 CA 未进入 Chromium 信任库时，可以显式用 TLS 校验的 curl 获取 Google Fonts 原始响应后向浏览器回放：

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium \
  --verified-cdn --cdn-cache /tmp/nekomi-cdn --artifacts /tmp/nekomi-browser
```

没有关闭证书验证、替换组件或修改信任库。这验证组件行为，不代表 Chromium 原生 CDN 证书链已配置。仅实际验证 Chromium，尚未验证 Firefox / Safari。

## 覆盖范围

- **元素持久化**：Worker 被禁用时，首页 → 文章 → 下一篇 → 首页，再重复四次往返。校验 document 请求仅首次一个；相同 performance.timeOrigin、壁纸容器、图像、公共侧栏、Drawer、色板、主题单例和 MDUI 组件构造器；随机 API 一次请求、一次显式 decode，无新 load / 重新淡入；共享状态不丢、单次主题操作只响应一次、路由播报节点不积累。
- **真实 View Transitions**：采样浏览器 ViewTransition.ready 后的正文伪元素，确认非线性滑入动画实际运行、根画面不交叉淡入。
- **P0 首页**：四项主 Tabs、键盘 / ARIA、Hash 与历史、搜索准确数量 / 高亮 / 清空 / 空结果 / 分类 / 标签、搜索 URL 刷新恢复、原生 MDUI 按钮和图标导航，以及默认 / 已筛选首页的返回。
- **内容迁移与文案**：P2 原始迁移基线不覆盖；P2.3 明确记录文案摘要与少量标题 / 代码变更，其余代码及所有标题 ID / 层级仍与原基线逐篇比对；元数据标题、语言、代码复制到真实剪贴板、原生 List 层级目录、图片、表格和长代码溢出；旧文章 URL 和静态 HTTP 404。
- **P2.3 动效与文案**：读取原生 View Transition 的伪元素、关键帧边界与 500ms 曲线，证明共享标题 / 封面实际运行；正反向 / 历史 / 键盘、两个视口 / 两主题、唯一名称清理、连续目录标记、真实 350 / 200ms WAAPI、原生 Tabs + 面板、卡片状态、减少动效、快速导航和无 API fallback；图片迟迟不返回时仍在预算后完成导航，随后保留失败回退。公开文案遍历首页与十篇文章，保留 demo 数据与真实身份，默认友链 / 评论仍为空。
- **P2.2 工程**：闲置不预取全站、hover 预取与标题 / 原生按钮去重、原生相邻 Card 预取；Shiki 双主题颜色、单层包装及代码文本；本地响应式 WebP / srcset / 固有尺寸、原生 TOC active / aria-current / H2–H6 缩进与超长标题；配置副本增加相对 Markdown 图片和 H5 / H6，测试生成图片 404 时的全部回退；手机 App Bar 下 16px 间距、目录收起后弹簧定位与焦点。
- **阅读**：弹簧滚动的启动 / 滚轮和触摸中断 / 再定位 / 精确偏移，当前目录 / 目标焦点 / Hash / 刷新 / 前进后退，手机原生 Collapse 和减少动态效果。
- **移动导航 / 主题**：原生 Drawer 聚焦 / 关闭 / 跨断点 / 滚动锁，原生列表项 SPA 导航，文章搜索返回首页，浅色 / 深色 / 系统循环、刷新记忆和系统变化。
- **响应式**：首页 / 阅读页在 1440×900、1360×900、1359×900、1280×800、1024×768、960×720、390×844、320×700，再加 1119 / 1120 / 1439px 边界 × 浅色 / 深色与无壁纸表面，正文行宽、透明 320px 侧栏、App Bar 文档流占位、折叠目录 / 宽屏目录、无页面横向溢出。
- **表面与对比度**：读取实际计算颜色和透明度，分别合成全黑 / 全白壁纸，检查侧栏、小字、Tabs、首页摘要、文章正文 / 链接及右目录的文本对比度不低于 4.5；检查手机加强遮罩。
- **排版 fixture**：复制原 Markdown，仅按 `fixtures/visual.json` 改副本 frontmatter，构建有封面 / 头图、长标题六标签、无标签和无演示提示的真实页面。所有指定视口均验证图文比例、顶端对齐、首屏正文、可选区域空白与跨路由阅读区透明度；不改变仓库文章。
- **辅助缓存**：真正注册壁纸 Worker，验证其作用域、opaque 响应和刷新复用，区别于 DOM 持久化。
- **失败与时序**：壁纸加载失败的 MD3 回退；存储权限被拒绝时主题仍跨路由保留；图片尚未返回时先导航，最终沿用原加载任务和壁纸节点。
- **纯静态内容**：关闭 JavaScript 后仍有完整文章、元数据、代码和目录，不依赖运行时正文请求。
- **配置 fixture**：独立构建七项友链 / 四条明确标注评论的配置，验证五项预览 / 完整原生 Dialog、评论只链接真实文章且不伪造锚点、Drawer → Dialog 的焦点返回、320px 与短屏下三个侧栏 Tabs 没有多层滚动。

默认图片 fixture 是本项目现有截图，不为每个用例下载随机大图；不会写入默认文章封面、站点头像、友链或评论。交付截图 / 录屏另使用 P1.1 已实际请求并检查过的 API 原始图片。

`--only persistence|home|content|reader|engineering|motion|copy|mobile|cache|layouts|surfaces|pending|fixtures|covers` 可单独复测；`--skip-fixtures` 跳过额外配置构建。测试产物和临时构建自动清理，`--artifacts` 保存全部指定视口的首页 / 文章明暗截图、部分封面 / 长标题截图、布局与对比度 JSON，以及失败现场。临时构建与仓库放在同一文件系统，适配 Astro 的资源 rename。

## 子路径部署

```sh
SITE_BASE=/Nekomi/ npm run build
python3 tests/browser_audit.py --chromium /usr/bin/chromium --base /Nekomi/ --verified-cdn
# 恢复默认产物
npm run build
```

`--dist` 可指定其他构建目录。子路径测试提供与静态托管一致的挂载，不使用 Node 服务。

历史正文摘要保存在 `fixtures/content-baseline.json`，仅用于这次迁移的完整性回归；正文、示例代码和标题不应为满足测试而删改。首页数量断言依赖现有演示数据，未来内容更新时需同步调整。

独立配置构建使用临时 `NEKOMI_CONFIG`、`NEKOMI_CONTENT_DIR`、`ASTRO_OUT_DIR` 和 `ASTRO_CACHE_DIR`；最后一个参数隔离 Content Collections 缓存，避免预览副本的同 ID 元数据污染日常构建。临时数据与缓存随测试清理，不写入生产内容或配置。

## 截图与实时录屏

`capture_motion.py` 打开生产静态产物，不修改文章或配置。需安装 Playwright 的 ffmpeg（`python3 -m playwright install ffmpeg`），或沿用已安装浏览器目录。默认从真实 API 加载背景；`--wallpaper` 可回放先前 HTTP 获取并审阅的原始响应。

```sh
python3 tests/capture_motion.py --video --wallpaper /path/to/reviewed.png --cdn-cache /tmp/nekomi-cdn
# 对独立封面配置构建进行同样采集，不把测试数据写进默认内容
python3 tests/capture_motion.py --dist .astro/p23-delivery --label p23-cover --video --wallpaper /path/to/reviewed.png --cdn-cache /tmp/nekomi-cdn
```

录屏使用正常速度，没有放慢动画或伪造中间帧；只剪除开头浏览器加载阶段。`motion_audit.py` 中的伪元素探针只用于测试，不进入生产 JS。设计与原生 / 扩展边界详见 [MOTION.md](../docs/MOTION.md)。

## P2.4 SEO 与大量文章

```sh
# 默认示例站：不输出假正式 Canonical，示例不进入索引 / RSS
python3 tests/browse_audit.py --dist dist --artifacts /tmp/nekomi-p24/default
# 额外 32 篇只写入临时 Collection，测试 42 篇 / 七页
python3 tests/browse_audit.py --fixture --artifacts /tmp/nekomi-p24/root
python3 tests/browse_audit.py --fixture --base /Nekomi/ --artifacts /tmp/nekomi-p24/subpath
```

fixture 的测试域名是保留示例地址 `https://nekomi.example`，不代表实际部署；临时 config 中的发布 / 非 demo 字段只验证 SEO 策略，不提交为正式数据。检查 Canonical 自引用、OG / X、JSON-LD、明确修改日期 / 无日期、可用图片 / 无图、Sitemap 与 RSS 排除示例、Robots、静态分类 / 标签 / 月份。

浏览器检查全量搜索、列表批次及准确位置恢复、恢复首五帧、浏览器前进 / 后退、相邻文章 / Hash 返回、直接打开回退、无完整重载的公共节点持久化。扣留网络响应、返回 503、快速滚动 / 查询 / 离页检查一次请求、明确重试、取消和过期结果；手动加载不移动视口并接续键盘焦点。实际关闭 JavaScript 遍历全部七张分页及其真实链接。原 P0 测试的首批数量改为六篇，分类 / 标签检查改为独立静态列表；P2.3 历史测试按新的来源返回行为验证前进 / 后退，未删除动效断言。

新脚本仍由 Python 静态服务器提供生产产物；截图 / 录屏说明见 [P24 图集](../screenshots/P24.md)。请顺序执行 Astro 构建，避免共享预渲染缓存的并发写入。


## P3 默认主题验收

```sh
npm run test:config
npm run test:social
npm run test:comments
python3 tests/p30_audit.py --screenshots
```

五套配置（Default、Fresh、Minimal、自定义中文 / 英文品牌、无社交与 RSS）分别检查 1440×900 桌面与 390×844 触控手机、浅色与深色。检查真实 MDUI Tabs CSS Part 四角与吸顶，标题区域仅有标题，独立 brandFont 不修改文章字体，正确品牌 SVG / 网站 / 邮箱图标，RSS 同地址去重与一次普通文档导航，功能关闭后无空社交容器，默认及自定义页脚，搜索持久 live region 和跨页状态。截图位于 screenshots/P30.md。

分页套件不再依赖可见页码：检查实际下一页 URL 在追加后更新、末尾没有冗余提示及空分页容器；慢网 / 重试 / 稳定滚动 / 无脚本七页遍历全部保留。对比度回归检查实际保留的首页标题，不再检测已删除的说明文字。品牌资源及 CC0 许可见 src/assets/icons/README.md。

## P3.1 Markdown 与阅读能力

```sh
npm run test:reading
python3 tests/reading_audit.py --screenshots
python3 tests/reading_audit.py --base /Nekomi/
```

临时文章覆盖错误图表 / 内嵌配置、损坏图片、嵌套 Tabs / 折叠锚点、宽公式、草稿与正式内容排除；正式仓库只有三篇明确标识的示例。验证生产静态产物、桌面 / 手机浅深、无 JS 的公式 / 全部 Tab 正文 / 原链接、外部视频点击前零连接、主题重绘、原图 URL 在缓存重建后仍为 200、功能全关时不下载对应引擎 / 样式 / 字体，及独立友链页和原公共 DOM 持久化。

视频跨域响应使用明确的本地测试回放，检查平台地址、点击后加载和关闭，不把回放当作真实平台播放成功。Google Fonts 仍通过保留证书验证的 curl 缓存回放。实际图片 / KaTeX / Mermaid / PhotoSwipe 均使用生产 npm 构建代码，不替换 SDK。

定向边界在 P3.1 fixture 构建后运行：

```sh
python3 tests/reading_edges.py
python3 tests/reading_edges.py --dist .astro/p25-tests/p31-core-base/dist --base /Nekomi/
```

使用实际 Chromium 触摸输入检查滑动 / 双指缩放 / 拖动，另测灯箱期间搜索快捷键、单图 / 原图失败、带灯箱离页、减少动态、引擎加载中变色、隐藏图表展开、长行内公式、闭合 Details 的目录状态及嵌套 Tabs 键盘作用域。

`python3 tests/reading_assets.py` 另外验证 src/ 之外的独立 Markdown 目录：与项目资产内容相同但路径不同的图片，在连续两次构建后仍有可访问的全尺寸图片。检查内部构建路径不会写入 HTML，避免资产去重导致原图失效或文件路径泄露。


## v1.0 个性化装饰与配置

```sh
node --test tests/config.test.mjs
python3 tests/decorations_audit.py --screenshots
```

使用生产静态构建与真实 Chromium，覆盖五个评论适配器、根 / 子路径、默认关闭 / 空来源 / 坏图 / 拥挤侧栏、预览数量为 0、1440 / 1280 / 1024 / 390 / 320px 与短视口、浅深 / 跟随系统、触控 Drawer、评论故障和重试、减少动态、跨页图片和壁纸 DOM 保持。对评论图片与挂载容器做几何不相交检查，不读取第三方编辑器私有结构。第三方 SDK 使用真实文件，服务 API 为受控回放，不会发出真实评论。

测试 PNG 下载到 `/tmp`，只复制进 `.astro/p25-tests/*/dist/images/`，不会写入 public 或主题默认资源；临时照片同理。素材许可、截图及复现说明见 [screenshots/DECORATIONS.md](../screenshots/DECORATIONS.md)。`--providers waline --skip-edges` 可只运行一种根路径配置；完整验收请使用默认参数。

## v1.0.0 发布前核心检查

```sh
node --test tests/config.test.mjs tests/social.test.mjs tests/comments.test.mjs tests/reading.test.mjs
npm run check
npm run build
python3 tests/release_audit.py
python3 tests/reading_audit.py
python3 tests/comments_audit.py
python3 tests/theme_audit.py
python3 tests/browse_audit.py --fixture
```

`release_audit.py` 检查版本与锁文件、Node.js 要求、许可和中文发布说明，并分别在根路径 / 子路径构建临时正式发布配置。三个示例原样复制，另外增加一篇只存在于临时目录的非 demo 文章，验证移除顶部标签后，示例仍 noindex、排除 RSS / Sitemap / BlogPosting，而真实文章仍正常收录；结束时核对源示例字节没有变化。阅读套件同时在真实浏览器确认文章头部没有旧标签。上述操作不创建 Tag、GitHub Release 或部署。
