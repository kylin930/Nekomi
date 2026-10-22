# Nekomi · 小林的小窝

基于 **MDUI 2.1.5 / Material Design 3** 的纯静态博客首页。以 Stellar 的融入式侧栏和内容导航为布局参考，借鉴 G 的标题、摘要与时间信息层级；全部页面代码独立实现。

没有绑定 Hexo、Typecho 或其他博客框架，也没有构建步骤。文章、日期、分类与标签均为演示数据，文章入口打开摘要预览。

![桌面端浅色](screenshots/desktop-light-1440x900.png)

[桌面深色](screenshots/desktop-dark-1440x900.png) · [手机浅色](screenshots/mobile-light-390x844.png) · [手机深色](screenshots/mobile-dark-390x844.png) · [手机抽屉](screenshots/mobile-drawer-390x844.png) · [分类](screenshots/desktop-categories-1440x900.png) · [文章预览](screenshots/desktop-preview-1440x900.png) · [手机搜索](screenshots/mobile-search-390x844.png)

## 开发

在仓库根目录启动任意静态 HTTP 服务，例如：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

浏览器访问本地 8080 端口。运行时需能访问 `unpkg.com`、`fonts.googleapis.com` 和 `fonts.gstatic.com`。MDUI 的 CSS / JS 均固定为 `2.1.5`，通过 unpkg 引入。

## 页面与组件

- **侧栏**：透明背景，不设置整体边框、圆角或阴影；MDUI Avatar、Text Field、List / List Item 组成个人信息、搜索、最近更新及友链。内容超高时可滚动。
- **内容导航**：主内容区内的 MDUI Tabs + `mdui-tab-panel slot="panel"`。选中、指示器和面板显隐由组件控制，公开 `container` part 实现导航吸顶。
- **文章列表**：原生 outlined Card；自定义样式仅安排阅读内容、标题链接、摘要、元信息与间距。标签使用 Chip，操作使用 Button。
- **汇总视图**：分类与按月归档使用原生 List / List Item；标签页使用 Chip。所有计数由同一份文章数据推导。
- **移动端**：860px 及以下改用顶部工具栏和原生模态 Navigation Drawer；焦点约束、滚动锁定、Escape / 遮罩关闭由 MDUI 处理。
- **主题**：`setColorScheme('#476756')` 生成完整 MD3 语义色板；`setTheme()` 管理浅色、深色和系统模式。两个 Dropdown / Menu 入口同步，偏好保存在本地。

没有复制 G 的 PHP、CSS、JavaScript 或图片，也没有引入其他 UI 框架、插画、背景图或占位美术资源。参考范围与许可证见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

封面布局示例：[桌面右侧封面](screenshots/cover-layout-desktop-1440x900.png) · [手机上方封面](screenshots/cover-layout-mobile-390x844.png)。示例仅在浏览器测试中临时引用本项目已有界面截图，默认演示文章保持无图状态；配置 `cover` 后自动采用该布局。

## 数据配置

编辑 [`assets/js/data.js`](assets/js/data.js)：

```js
site: {
  name: '小林的小窝',
  tagline: '分享技术、日常',
  intro: '前端开发，偶尔记录生活。',
  avatar: '',
  avatarAlt: '小林的小窝站点头像',
  avatarFallback: '林'
}
```

文章字段为 `id`、`title`、`excerpt`、`date`（`YYYY-MM-DD`）、`category`、`tags` 与可选的 `cover`。友链字段为 `name`、`url`、`avatar` 与 `description`。

- 头像缺失或加载失败：回退为文字。
- 封面缺失：不创建图片区域；宽卡片封面在右，窄卡片在上，坏图连同链接区域自动移除。
- 友链默认空，不编造真实站点。配置后显示最多 5 个。
- 搜索标题、摘要、分类和标签；分类按钮、标签 Chip 可直接筛选。

图片接入细节见 [assets/images/README.md](assets/images/README.md)。

## 交互与无障碍

- 导航与 URL Hash 同步，支持深链接及前进后退。
- `/` 聚焦搜索，手机上直接打开抽屉并使用组件原生 `autofocus`；输入框内的 `/` 正常输入。
- 搜索支持空结果、原生清空按钮、可删除的关键词 Chip。桌面 `Escape` 清空，手机 `Escape` 关闭抽屉；`Enter` 进入首个结果或空结果标题。
- 文章标题、原生列表项和预览按钮打开 MDUI Dialog。抽屉 → 对话框以及对话框 → 筛选的转换等待 `closed`，不猜测动画时长。
- 支持跳过导航、键盘焦点、原生模态焦点约束、明暗模式、存储不可用回退和减少动效偏好。

MDUI 2.1.5 尚未提供完整的 Tabs 键盘 / ARIA 和图标按钮 ARIA 转发。小型 [`a11y.js`](assets/js/a11y.js) 适配只补齐这些缺口：通过 `click()` 激活选项卡，在固定版本的公开 part 上补充语义。它不重做视觉、面板管理或模态焦点机制。主题菜单另外保留对 2.1.5 取消单选及异步焦点竞争的针对性处理。

## 浏览器验证

运行说明及检查范围见 [tests/README.md](tests/README.md)。

```sh
python3 tests/browser_audit.py --chromium /usr/bin/chromium
```

当前云环境使用 `--verified-cdn`：curl 保持代理和 TLS 校验，取得原始 CDN 响应后在 Chromium 中回放。该测试不更改应用的 CDN 地址，也不关闭证书验证；它验证页面行为，不代表 Chromium 原生 CDN 证书链已配置。

截图由实际 Chromium 页面生成。默认演示内容没有阅读全文、评论、后台、分页或服务端搜索；Firefox / Safari 尚未实测。

## 文件

```text
index.html              页面及官方 panel slot 结构
assets/css/tokens.css   布局变量与减少动效设置
assets/css/main.css     响应式布局、阅读排版与公开 CSS Parts
assets/js/data.js       唯一内容数据源
assets/js/a11y.js       固定版本的必要无障碍补充
assets/js/theme.js      MD3 色板、主题与原生菜单
assets/js/app.js        渲染、搜索、URL 与组件之间的业务动作
screenshots/            重构后的实际浏览器截图
tests/                  可复现的浏览器回归
```

本项目采用 [MIT License](LICENSE)。
