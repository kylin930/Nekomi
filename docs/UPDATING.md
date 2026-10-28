# 更新 Nekomi 与保留站点内容

更新前阅读 [CHANGELOG](../CHANGELOG.md)，备份配置、Markdown、图片和自建扩展。建议把站点内容与主题修改分别提交，便于查看更新差异。

## 保留自己的文件

- `site.config.json`：站点配置。
- `src/content/posts/`、`src/content/pages/`：文章与独立页面。
- `src/assets/`：本地图片、字体等资源。
- `public/`：自己的图片、图标、脚本及其他静态文件。
- `src/custom/`：自建评论适配器等扩展。

如果修改过主题组件或样式，也应单独记录这些修改。不要直接用旧 `public/` 目录整体覆盖新版：其中同时包含主题维护的壁纸 Worker、图标及其他资源，应按文件审阅并合并。

## 引入新版主题

克隆或 Fork 且保留上游历史的仓库，可以在备份分支上合并上游更新，处理冲突后检查配置与内容。

从 GitHub Template 创建的仓库具有独立历史，建议在新目录准备新版主题，再迁入自己的配置、内容与资源。不要直接覆盖旧目录，也不要把新版示例文章误当成自己的内容。

## 将内容放在主题目录之外

也可以通过构建环境变量指定独立配置和 Markdown 目录：

```sh
NEKOMI_CONFIG=/path/to/my-site.json \
NEKOMI_CONTENT_DIR=/path/to/posts \
NEKOMI_PAGES_DIR=/path/to/pages \
npm run build
```

`NEKOMI_CONFIG` 继承主题默认值，不叠加仓库根目录的 `site.config.json`。图片资源仍需放在项目可访问的 `src/assets/` 或 `public/` 路径；评论扩展模块的路径要求见[适配器文档](COMMENT-ADAPTERS.md)。

## 更新后检查

执行 `npm ci`、`npm run check` 和 `npm run build`，再用 `npm run preview` 检查页面、主题切换、导航和所启用的扩展。无效配置会报告具体字段路径，按当前[配置参考](CONFIGURATION.md)修正。

确认自己的域名、部署路径、评论标识和索引设置未被替换，再按[部署指南](PUBLISHING.md)发布。默认值、数组覆盖和留空规则见[简明配置指南](CONFIGURATION-GUIDE.md#编辑配置与默认值)。
