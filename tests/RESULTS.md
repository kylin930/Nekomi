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
