# 参与 Nekomi

感谢你愿意改进 Nekomi。主题代码使用 MIT 许可；提交前请确认代码和素材可以按所声明的许可使用，不复制 GPL 主题源码，不打包无授权头像或壁纸。参考设计时请说明来源。

## 参与方式

- 通过 [Issues](https://github.com/kylin930/Nekomi/issues) 报告问题、提出建议或分享使用体验。
- 改进文档、示例配置和截图，帮助其他站长更快上手。
- 提交主题代码、样式或无障碍改进。
- 编写新的评论适配器或扩展能力。

历史站点配置与旧示例见[历史配置与资料](docs/HISTORY.md)；普通用户升级主题见[升级指南](docs/UPDATING.md)。

## 开发环境

需要 Node.js 24 LTS 与 npm。MDUI 固定为 2.1.5，由 Vite 按组件引入；不要重新加入 CDN 或全局 mdui，也不要为局部动画引入大型框架。

```sh
npm ci
npm run dev
```

## 关键入口

- 用户配置与内容：`site.config.json`、`src/content/posts/`、`src/content/pages/`。
- 主题默认值与校验：`src/config/schema.mjs`；类型出口：`site.ts`。
- 构建配置：`publishing.mjs`。修改配置后运行 `npm run config:docs`，同步 JSON Schema、完整示例和配置表。
- 公共布局：`SiteLayout.astro`、Sidebar、Navigation、Footer；样式通过现有 Design Tokens 和公开 CSS Parts 扩展。
- 运行时：`runtime.js` 为单例；页面初始化通过 `AbortController` 清理监听、RAF、定时器和 Observer。MDUI 2.1.5 必需的原位 Swap 见[动效约定](docs/MOTION.md)。
- Markdown：标题 ID、图片、Shiki、代码和表格包装在 `src/plugins/markdown.mjs` 中一次完成，前台不重复渲染 Markdown。

## 提交前检查

```sh
npm run test:config
npm run check
npm run build
```

如果修改了配置字段或默认行为，请同步更新 `site.schema.json`、配置文档、示例和必要的截图。

## 浏览器与回归测试

浏览器测试需要 Python 3、Playwright 和系统安装的 Chromium：

```sh
pip install playwright
npm run test:browser
```

配置矩阵会写入 `.astro/` 下的临时目录，不改变正式内容；`--screenshots` 可更新真实截图。

需要完整的个人站输入时：

```sh
npm run build:personal
python3 tests/browser_audit.py --verified-cdn --cdn-cache /tmp/nekomi-cdn
python3 tests/browse_audit.py --fixture --cdn-cache /tmp/nekomi-cdn
python3 tests/browse_audit.py --fixture --base /Nekomi/ --cdn-cache /tmp/nekomi-cdn
```

不要并发执行 Astro 构建（共享内容缓存），也不要在浏览器测试期间覆盖它正在读取的产物。临时文章只放在 `.astro/` 或临时目录内，不加入默认内容。

## 评论集成

主题保持静态；真实 SDK 资源通过 TLS 校验下载或缓存，浏览器连接受控 API 响应，不向真实服务发言。Giscus 执行真实 `client.js`，远端讨论 iframe 用官方消息协议对端回放；OAuth 与云授权仍需维护者在真实站点验证。

```sh
npm run test:comments
python3 tests/comments_audit.py --screenshots --stress
python3 tests/comments_audit.py --base /Nekomi/ --stress
python3 tests/comments_edges.py
```

所有 Astro 构建顺序执行，不要与其他构建并发。扩展契约位于 `src/integrations/comments/index.ts`，内置能力在 `capabilities.ts`；新实现须声明能力、遵从 `AbortSignal` 并清理资源。最近 HTML 只做 inert 文本转换，不采用第三方 DOM。SDK iframe 是资源与样式隔离，不是安全沙箱；不要添加包含凭据的配置或没有公开依据的 API。

## 默认主题与社交链接

```sh
npm run test:social
python3 tests/p30_audit.py --screenshots
```

覆盖 Default / Fresh / Minimal、自定义中英文品牌及无社交配置；检查真实 Tabs CSS Parts、品牌 SVG、RSS 普通文档导航与去重、搜索 live region、简洁页脚和持久化外壳。分页套件同步检查可访问的上一页 / 下一页链接和没有冗余页码；生产浏览仍保留无脚本及 42 篇临时数据回归。

## 文档、截图与变更记录

- 修改行为或配置时，补充有意义的回归，并更新 `CHANGELOG.md`、配置说明和必要截图。
- 主题使用文档放在 `docs/`；截图索引放在 `screenshots/`；历史测试结果放在 `tests/`。
- 新增或替换截图时，使用真实构建产物，不伪造界面或功能状态。

## Issue 与 Pull Request

Issue 请带上版本、视口、主题、`base` 和最小重现步骤。PR 请说明实际问题、实现结果和验证方式；UI 改动附截图，配置或行为改动附回归命令。

GitHub Template 开关以及 Pages / Cloudflare 项目需要仓库所有者在平台设置，源代码不能替用户启用。

## 许可

主题代码采用 MIT 许可。第三方依赖、字体和素材遵循各自许可，详见[第三方声明](THIRD-PARTY-NOTICES.md)与[依赖许可清单](public/THIRD-PARTY-LICENSES.txt)。提交素材前请确认授权，并保留必要的署名信息。
