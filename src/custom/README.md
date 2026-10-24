# 你的前端扩展

可将自定义评论模块放在本目录，并通过 comments.custom.module 选择，不修改主题运行时。类型和生命周期见 docs/COMMENT-ADAPTERS.md，完整 REST 例子在 examples/comments/rest-adapter.ts。更新主题时保留本目录中的自有文件。这里的模块在浏览器运行，不能存放私钥或服务端凭据。
