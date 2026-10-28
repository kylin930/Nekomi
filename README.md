<img src="public/favicon.svg" width="80" height="80" alt="Nekomi Logo" />

# Nekomi

一个基于 Astro、MDUI 2 与 Material Design 3 的开源博客主题，通过配置和 Markdown 搭建自己的静态博客。

**[配置指南](docs/CONFIGURATION-GUIDE.md)** · [快速开始](#快速开始) · [文档](#文档) · [GitHub](https://github.com/kylin930/Nekomi) · [MIT 许可证](LICENSE)

## 主题预览

![Nekomi 默认主题桌面首页](screenshots/p30-default-home-light-1440.png)

[手机阅读](screenshots/p30-default-reader-light-390.png) · [深色模式](screenshots/p30-default-home-dark-1440.png)

## 主要特性

- **外观与个性化**：Default、Fresh、Minimal 三种预设，支持自定义配色、字体、头像、壁纸与可选角色装饰，适配浅色、深色和手机布局。
- **阅读与 Markdown**：代码高亮、目录、代码复制、图片灯箱、数学公式与 Mermaid 图表，以及提示块、折叠、内容 Tabs 等写作组件。
- **内容组织**：文章与独立 Markdown 页面，分类、标签、归档、搜索、静态分页和可选无限滚动。
- **导航与交互**：可配置导航和侧栏模块，无刷新切换、跨页壁纸保留与列表位置恢复；动效尊重系统的减少动态效果设置。
- **评论与扩展**：可选 Waline、Twikoo、Giscus、Artalk，支持自建评论适配器与自定义脚本；第三方评论和统计默认关闭。
- **SEO 与部署**：分享元数据、RSS、Sitemap 和索引控制，构建后输出纯静态文件，无需运行博客后端。

## 快速开始

### 运行项目

推荐 **Node.js 24 LTS**，最低版本为 **22.23.4**，使用 npm 安装依赖。

```sh
git clone https://github.com/kylin930/Nekomi.git my-blog
cd my-blog
npm ci
npm run dev
```

打开 `http://localhost:4321`。将项目推送到自己的仓库前，请先修改 Git 远程地址。

### 修改站点配置

编辑根目录的 `site.config.json`，只填写需要修改的选项，其余使用主题默认值：

```json
{
  "$schema": "./site.schema.json",
  "site": {
    "name": "我的博客",
    "tagline": "技术与日常"
  },
  "appearance": {
    "preset": "default"
  }
}
```

更换头像、主题色、壁纸、导航或页脚，请查看 **[简明配置指南](docs/CONFIGURATION-GUIDE.md)**。主题自带 Favicon 和 Apple 设备图标，可单独替换，与站点头像互不影响。

### 写第一篇文章

新建 `src/content/posts/hello.md`：

```md
---
title: 第一篇文章
date: '2026-10-28'
demo: false
---

## 从这里开始

在这里写 Markdown 正文。
```

保存后可访问 `/posts/hello/`。更多文章字段见 [文章信息参考](src/content/README.md)，扩展语法见 [Markdown 写作指南](docs/MARKDOWN.md)。

日常主要使用以下文件和目录：

```text
site.config.json       站点配置
src/content/posts/     文章
src/content/pages/     独立页面
src/assets/images/     可优化的图片
public/                按原路径发布的文件
```

模板中的示例内容默认不被索引；发布自己的文章前，请按[部署指南](docs/PUBLISHING.md)配置站点地址和索引设置。

## 文档

| 需求 | 文档 |
| --- | --- |
| 修改常用设置 | **[简明配置指南](docs/CONFIGURATION-GUIDE.md)** |
| 查询全部配置项 | [完整配置参考](docs/CONFIGURATION.md) · [完整配置示例](examples/full.config.json) |
| 写文章与使用扩展组件 | [Markdown 写作](docs/MARKDOWN.md) · [文章信息](src/content/README.md) |
| 添加关于、项目等页面 | [独立页面](docs/PAGES.md) |
| 调整侧栏与导航 | [侧栏布局](docs/SIDEBAR.md) · [导航配置](docs/CONFIGURATION.md#navigation) |
| 更换配色、字体与图片 | [个性化配置](docs/PERSONALIZATION.md) · [图片接入](docs/IMAGES.md) |
| 使用角色装饰或品牌图标 | [可选装饰](docs/DECORATIONS.md) · [品牌资源](docs/BRANDING.md) |
| 接入评论服务 | [评论接入](docs/COMMENTS.md) · [自建适配器](docs/COMMENT-ADAPTERS.md) |
| 加载自己的 JavaScript | [自定义脚本](docs/SCRIPTS.md) |
| 配置域名、SEO 与托管 | [部署指南](docs/PUBLISHING.md) |
| 更新主题并保留内容 | [升级指南](docs/UPDATING.md) |

## 部署

构建并在本地预览：

```sh
npm run build
npm run preview
```

将生成的 `dist/` 部署到 GitHub Pages、Cloudflare Pages 或其他静态托管平台，生产环境不需要常驻 Node.js 服务。

[GitHub Pages](docs/PUBLISHING.md#github-pages) · [Cloudflare Pages](docs/PUBLISHING.md#cloudflare-pages) · [自定义域名与子路径](docs/PUBLISHING.md#先配置站点地址与内容性质)

## 许可证与贡献

Nekomi 主题代码采用 [MIT License](LICENSE)。第三方依赖、字体和素材遵循各自许可，详见[第三方声明](THIRD-PARTY-NOTICES.md)与[依赖许可清单](public/THIRD-PARTY-LICENSES.txt)。自行添加的图片、字体和其他资源需确认使用授权。

欢迎通过 [Issues](https://github.com/kylin930/Nekomi/issues) 反馈问题，或按[贡献指南](CONTRIBUTING.md)提交改进。[变更记录](CHANGELOG.md)包含版本更新说明。
