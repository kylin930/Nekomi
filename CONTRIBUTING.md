# 参与 Nekomi

主题代码使用 MIT。提交前请确认代码和素材可以按所声明的许可使用；不复制 GPL 主题源码，不打包无授权头像或壁纸。参考设计时说明来源。

## 开发

Node 24 LTS 与 npm；`npm ci`、`npm run dev`。MDUI 固定 2.1.5，由 Vite 逐组件引入；不要重新加入 CDN / 全局 mdui，不为局部动画引入大型框架。

- 用户入口：site.config.json 与 src/content/posts/；主题默认值 / 校验：src/config/schema.mjs。
- 构建统一配置：publishing.mjs；类型出口：site.ts。改配置后运行 `npm run config:docs` 同步 JSON Schema、完整示例和配置表。
- 公共布局：SiteLayout.astro、Sidebar / Navigation / Footer；样式通过现有 Design Tokens 和公开 CSS Parts 扩展。
- runtime.js 为单例；页面初始化通过 AbortController 清理监听 / RAF / 定时器 / Observer。保留 MDUI 2.1.5 必需的原位 Swap，详见 docs/MOTION.md。
- Markdown 的标题 ID、图片、Shiki、代码 / 表格包装在 src/plugins/markdown.mjs 中一次完成；前台不再重复渲染 Markdown。

## 验证

```sh
npm run test:config
npm run check
npm run build
# Python 3 + pip install playwright；系统安装 Chromium
npm run test:browser
```

P2.5 配置矩阵在 `.astro/p25-tests/` 逐个构建，不改变正式内容。字体请求通过普通 TLS 校验的 curl 回放；测试图片为本项目截图。`--screenshots` 可更新真实截图。

P2.4 回归使用完整的可选个人站输入：

```sh
npm run build:personal
python3 tests/browser_audit.py --verified-cdn --cdn-cache /tmp/nekomi-cdn
python3 tests/browse_audit.py --fixture --cdn-cache /tmp/nekomi-cdn
python3 tests/browse_audit.py --fixture --base /Nekomi/ --cdn-cache /tmp/nekomi-cdn
```

不要并发执行 Astro 构建（共享内容缓存），也不要在浏览器测试期间覆盖它正在读取的产物。临时文章只在 `.astro/` 或临时目录内，不加入默认内容。

修改行为或配置时补充有意义的回归，更新 CHANGELOG、配置说明及必要截图。Issue 请带版本、视口、主题、base 和最小重现；PR 说明实际问题、结果及验证。GitHub Template 开关和 Pages / Cloudflare 项目需要仓库所有者在平台设置，源代码不能替用户启用。
