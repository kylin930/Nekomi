# P2 / P2.1 静态构建浏览器回归

依赖 Node.js 24 / npm（构建）、Python 3、Playwright 1.62.0 和 Chromium（浏览器验证）。构建完成后，测试仅用 Python 文件服务器提供 `dist/`，不是 Astro dev / preview，也不需要生产 Node 服务。

```sh
npm ci
npm run check
npm run build
python3 -m pip install -r tests/requirements.txt
# 使用系统 Chromium；也可自行安装 Playwright Chromium
python3 tests/browser_audit.py --chromium /usr/bin/chromium --artifacts /tmp/nekomi-browser
```

应用继续使用固定的 MDUI 2.1.5 unpkg 资源。默认保留真实 CDN 网络及证书验证；云代理 CA 未进入 Chromium 信任库时，可以显式用 TLS 校验的 curl 获取原始响应后向浏览器回放：

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium \
  --verified-cdn --cdn-cache /tmp/nekomi-cdn --artifacts /tmp/nekomi-browser
```

没有关闭证书验证、替换组件或修改信任库。这验证组件行为，不代表 Chromium 原生 CDN 证书链已配置。仅实际验证 Chromium，尚未验证 Firefox / Safari。

## 覆盖范围

- **元素持久化**：Worker 被禁用时，首页 → 文章 → 下一篇 → 首页，再重复四次往返。校验 document 请求仅首次一个；相同 performance.timeOrigin、壁纸容器、图像、公共侧栏、Drawer、色板、主题单例和 MDUI 实例；随机 API 一次请求、一次显式 decode，无新 load / 重新淡入；共享状态不丢、单次主题操作只响应一次、路由播报节点不积累。
- **真实 View Transitions**：采样浏览器 ViewTransition.ready 后的正文伪元素，确认非线性滑入动画实际运行、根画面不交叉淡入。
- **P0 首页**：四项主 Tabs、键盘 / ARIA、Hash 与历史、搜索准确数量 / 高亮 / 清空 / 空结果 / 分类 / 标签、搜索 URL 刷新恢复、原生 MDUI 按钮和图标导航，以及默认 / 已筛选首页的返回。
- **内容迁移**：十篇 Markdown 的可见文本 SHA-256、全部标题 ID / 层级与原始代码逐篇比对迁移前基线；元数据标题、语言、代码复制到真实剪贴板、嵌套目录、图片、表格和长代码溢出；旧文章 URL 和静态 HTTP 404。
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

`--only persistence|home|content|reader|mobile|cache|layouts|surfaces|pending|fixtures` 可单独复测；`--skip-fixtures` 跳过额外配置构建。测试产物和临时构建自动清理，`--artifacts` 保存全部指定视口的首页 / 文章明暗截图、部分封面 / 长标题截图、布局与对比度 JSON，以及失败现场。临时构建与仓库放在同一文件系统，适配 Astro 的资源 rename。

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
