# 保留的历史开发输入

本文记录仓库中仍可使用的历史配置和内容，供维护者复现旧页面、迁移数据或进行回归检查，不是新用户的默认配置。日常使用与更新主题请看[配置指南](CONFIGURATION-GUIDE.md)和[升级指南](UPDATING.md)。

## 原个人站点输入

原“小林的小窝”配置保存在 [examples/personal/site.config.json](../examples/personal/site.config.json)，十篇旧示例和稳定锚点保存在 [examples/demo-posts/](../examples/demo-posts/)。下列命令仅切换构建输入，不覆盖当前配置或文章：

```sh
npm run dev:personal
npm run build:personal
```

若需恢复这些输入，请先备份自己的真实内容，再按需复制配置与示例到目标目录。原配置中的壁纸 API 属于原站选择，使用前应确认访问条件与图片使用权；通用主题默认不会请求它。旧示例保留 `demo` 索引保护。

## 历史与验证资料

开发阶段的变更保存在 [CHANGELOG](../CHANGELOG.md)，测试输入、截图和验证边界保存在 [tests/README.md](../tests/README.md) 与 [tests/RESULTS.md](../tests/RESULTS.md)。这些资料及原有脚本继续保留，不因 README 的结构调整而删除。
