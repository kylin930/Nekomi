# P0 / P0.5 / P1 浏览器回归

开发依赖为 Python 3、Python Playwright 和 Chromium，应用无需构建。脚本自动启动并关闭本地 HTTP 服务。

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium --artifacts /tmp/nekomi-browser
```

默认走真实 CDN 链路并保留证书验证。若云代理 CA 被 curl 信任而 Chromium 信任库未配置，可显式使用：

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium --verified-cdn --artifacts /tmp/nekomi-browser
```

`--verified-cdn` 用保留代理与 TLS 校验的 curl 获取原始 CDN 响应，再由 Playwright 回放，不改变应用 URL、组件资源或信任库。它验证页面行为，不代表 Chromium 原生 CDN 证书链已配置。没有关闭 TLS 校验。

检查范围：

- P0 原生 Tabs 显隐、选中、ARIA、键盘、Hash 与历史；搜索准确数量、清空、空结果、标签 / 分类筛选、搜索 URL 刷新恢复。
- 所有文章入口（标题、按钮、封面、原生 List Item）进入真实阅读页；旧摘要 Hash 兼容跳转；返回列表、文章标签筛选、相邻文章。
- 三态主题按钮、键盘激活、刷新记忆、系统主题、跨页面存储同步与存储被拒绝。
- 移动 Top App Bar 的文档流占位；Drawer 滚动锁定、焦点约束、自动聚焦、全部关闭方式及跨断点关闭。
- 嵌套目录、自动生成的唯一中文锚点、当前章节、标题永久链接、锚点焦点、直接访问 / 刷新 / 前进后退；手机原生 Collapse 键盘操作与固定顶栏避让。
- 十篇正文各自可打开；代码语言标识、复制内容精确匹配剪贴板、键盘横向滚动、有效正文图片、表格语义、无头图状态。
- 无效 / 空 / 恶意 ID 提示、正文请求失败与重试、正文图 / 封面 / 头像坏图、友链 URL 过滤。
- 临时用本项目截图验证横竖封面、自适应图文位置、封面键盘导航及文章头图；默认数据无新增美术资源。
- 首页与阅读页在 1440 / 1024 / 861 / 860 / 390 / 320px 下分别检查浅色 / 深色、无页面水平溢出、正文宽度、目录位置与透明侧栏；极长标题和 URL 换行。
- 壁纸的浅色 / 深色 / 系统切换、明暗共用、全站生效、无效路径 / 协议回退和过期请求；检查真实计算遮罩、极端明暗图片下正文及链接的 AA 对比度、分类配色对比度。
- 非线性内容滑入和减少动态效果偏好。正常页面不得产生意外 JavaScript 或资源失败。

HTTP 错误与图片失败仅由专门的测试 fixture 注入；不会修改默认演示数据。`--artifacts` 保存全部宽度 / 主题的首页和阅读页截图，以及失败截图。仓库中精选交付截图来自相同 Chromium 页面。

测试依赖固定演示内容（例如 CSS 匹配两篇），内容更新后应调整预期。仅实测 Chromium，不代表 Firefox / Safari 验证完成。

参考：[MDUI 2 文档](https://www.mdui.org/zh-cn/docs/2/)与 [2.1.5 元数据](https://unpkg.com/mdui@2.1.5/custom-elements.json)。适配仅补齐该版本缺失能力，组件视觉、模态焦点与面板显隐仍由 MDUI 提供。
