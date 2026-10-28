# 动态评论服务

Nekomi 始终输出静态站点。启用评论后，浏览器连接你选择的独立服务；主题不提供评论数据库、账号、审核后台或常驻 Node.js 服务。默认 `comments.provider: "none"`，不会请求评论 SDK 或评论 API。

## 实际能力

| 适配器 | 客户端 | 明暗主题 | 当前文章计数 | 最新评论 | 具体评论定位 |
| --- | --- | --- | --- | --- | --- |
| Waline | 3.16.1 | 公开 update API，始终保留 path | 公开查询 API | 公开查询 API | 不声明，链接到所属文章 |
| Twikoo | 2.0.17 | 继承颜色、根 data-theme 与 SDK 暗色选择器 | 公开 SDK API，包含回复 | 公开 SDK API，包含回复 | 不声明，链接到所属文章 |
| Giscus | 官方托管 client.js | 官方 setConfig 消息 | 已挂载讨论的 metadata，评论与回复之和 | 无公开能力，隐藏侧栏 Tab | 不声明 |
| Artalk | 2.10.0 | 公开 setDarkMode API | 公开 Stats API | 公开 Stats API | 不声明，链接到所属文章 |
| Custom | 你的浏览器模块 | 按能力声明 | 可选 query / live | 可选 | 实现 locate 后才生成锚点 |

表中的查询能力要求服务器开放相应接口并允许本站 CORS。服务端关闭统计、访问失败或数据无效时不会伪造数字；查询计数失败时隐藏计数，评论组件仍可使用。Giscus 的计数来自存在的当前讨论，不提供任意文章批量查询；尚无讨论且没有 metadata 时不猜测为 0。最新评论不调用 GitHub 私有接口，也不要求把 PAT 放入前端。

Waline / Twikoo / Artalk 的 npm 客户端资源固定版本并带 SRI。Giscus 的官方 `client.js` 是滚动更新的托管服务，不能虚构版本或固定 SRI；需要锁定资源时请自行维护完整兼容服务及其资源。

## 共同配置

```json
{
  "comments": {
    "provider": "waline",
    "lazy": true,
    "counts": true,
    "recent": true,
    "recentLimit": 4,
    "timeout": 15000,
    "keyPrefix": "/posts/",
    "waline": { "serverURL": "https://comments.example.com" }
  }
}
```

示例地址不是已部署服务。`lazy` 在评论区接近视口时挂载；`counts:false` 不发起 Nekomi 的额外计数查询，不显示顶部计数（SDK 自身列表仍可能显示其自带计数）。`recent:false` 隐藏侧栏最新评论；模块顺序和展示方式由 `layout.sidebarSections` 决定，未配置时使用 `layout.sidebarTabs`。Tab 模式在实际激活时查询，常驻模块按可见性与懒加载设置查询，手机 Drawer 关闭时不查询；成功结果在本次文档内缓存 60 秒，不可见时取消未完成请求。不会轮询，也不会预读所有文章的评论。详见[侧栏说明](SIDEBAR.md#最新评论的加载)。

`timeout` 为 3000–60000ms，每个初始化 / 查询任务的时间预算；失败显示重试。普通网络请求使用 AbortSignal；不支持取消的 SDK 请求在独立浏览上下文销毁时终止。正常空列表显示空状态；不支持最近查询的自定义适配器显示能力说明。

单篇关闭：

```yaml
comments: false
```

该文章不输出评论容器，不初始化评论实例；最新评论也不会链接到已关闭评论的文章。`provider:none` 关闭整站，`provider:link` 使用单篇 `commentsUrl` 提供站外讨论链接。

## Waline

1. 按 [Waline 官方部署指南](https://waline.js.org/guide/get-started/) 部署独立服务及数据库，可选其支持的托管平台；服务端运行环境与静态博客分开。
2. 设置可信站点、审核 / 反垃圾 / 邮件等服务端配置，确认公开 API 能从博客域名访问。
3. 复制 [waline.config.json](../examples/comments/waline.config.json) 的 comments 部分：

```json
{"comments":{"provider":"waline","waline":{"serverURL":"https://comments.example.com","lang":"zh-CN","login":"enable"}}}
```

serverURL 是服务根地址，可包含反向代理前缀，不要重复添加 `/api/`，也不要包含凭据、查询参数或 Hash。login 支持 enable / disable / force；认证和用户信息仍由 Waline 负责。Nekomi 默认关闭其额外的页面访问统计、表情图片搜索与表情包请求，保留标准评论编辑与服务端认证能力。

文章用 `path=稳定键`，计数用 GET `/api/comment?type=count&url=...`，最近用 GET `/api/comment?type=recent&count=...`。最近响应按官方当前客户端的数组协议解析，不将错误对象当评论。头像缺失时使用文字回退。

[客户端 API](https://waline.js.org/reference/client/api.html) · [组件选项](https://waline.js.org/reference/client/props.html) · [服务端 API](https://waline.js.org/reference/server/api.html)

## Twikoo

1. 按 [云函数部署](https://twikoo.js.org/backend.html) 与 [前端部署](https://twikoo.js.org/frontend.html) 创建独立 Twikoo 服务，完成允许域名、存储、审核等配置。
2. HTTP 自建 / 托管服务填写 URL；腾讯云填写环境 ID，按需设置 region：

```json
{"comments":{"provider":"twikoo","twikoo":{"envId":"https://comments.example.com","lang":"zh-CN"}}}
```

```json
{"comments":{"provider":"twikoo","twikoo":{"envId":"your-cloud-environment-id","region":"ap-shanghai"}}}
```

HTTP 使用较小的 twikoo.min.js；云环境 ID 自动选择包含腾讯云 SDK 的 twikoo.all.min.js。两者均锁定 2.0.17，云环境仍需由你部署和授权。非常窄的嵌入区域只让其评论标题 / 工具行换行，避免 320px 手机产生内部横向溢出。实际云资源访问、登录和管理密码不能由静态主题代办。

使用官方 getCommentsCount / getRecentComments，无需先调用 init；path 显式传稳定键。当前 2.0.17 客户端支持 href，传入实际文章 URL，避免把内部挂载文档用作来源链接。评论数与最近列表包含回复。Twikoo 没有文档化的销毁 API，不调用猜测的 destroy / Vue 私有方法；通过销毁完整 iframe 释放其 Vue 状态、监听与请求。

[API 文档](https://twikoo.js.org/api.html) · [HTTP 客户端配置示例](../examples/comments/twikoo.config.json) · [官方客户端源码](https://github.com/twikoojs/twikoo/tree/main/packages/client/src)

## Giscus

1. 创建支持 Discussions 的公开 GitHub 仓库并启用 Discussions。
2. 安装 [Giscus GitHub App](https://github.com/apps/giscus)，仅授权所需仓库。
3. 在 [giscus.app](https://giscus.app/zh-CN) 生成仓库 / 分类的公开 ID；通常选择专门用于评论的分类。

```json
{"comments":{"provider":"giscus","giscus":{"repo":"your-name/your-blog","repoId":"实际公开仓库 ID","category":"Comments","categoryId":"实际公开分类 ID","lang":"zh-CN","reactions":true}}}
```

不要保留示例占位 ID，不需要也不能填写 GitHub PAT / App 私钥。适配器使用 `mapping=specific`、`term=稳定键`、`strict=1`，不依赖标题。通过官方 metadata / setConfig 消息处理计数与主题，检查消息 origin 和 iframe source。设置真实文章 backlink。

没有公开全站最近评论接口，因此侧栏最近评论 Tab 自动隐藏。只有收到当前讨论的官方 metadata 才显示总数；未收到不会显示假 0。仓库授权、真实 OAuth 登录、浏览器第三方存储策略需要在自己的站点验证。

`assets.script` 若改为自托管地址，必须指向完整兼容 Giscus 服务的 client.js；官方脚本根据自身源站构建 widget URL，单独镜像一个 JS 文件不能替代 Giscus 服务。消息只接受该服务源站和对应窗口。

[最小配置](../examples/comments/giscus.config.json) · [官方高级用法与消息协议](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md)

## Artalk

1. 按 [Artalk 部署文档](https://artalk.js.org/zh/guide/deploy.html) 部署独立 Go 服务及数据库。
2. 在服务端创建 / 配置站点名称、可信域名、审核与反垃圾策略，保证公开 Stats 接口的访问策略符合需求。

```json
{"comments":{"provider":"artalk","artalk":{"server":"https://comments.example.com","site":"My Blog","locale":"zh-CN"}}}
```

server 指向服务根地址，不重复添加 `/api/v2`。使用公开 init / destroy / setDarkMode；最近查询 `/api/v2/stats/latest_comments`，计数查询 `/api/v2/stats/page_comment`，均带 site_name。不调用需要管理凭据的 pages/fetch 等管理 API。额外访问量递增 pvAdd 默认关闭。

最新接口没有直接提供头像 URL 时使用文字头像，不猜测用户邮箱或解密信息。服务端未开放 Stats 返回失败时显示不可用 / 重试；可以将 recent 或 counts 关闭。

[最小配置](../examples/comments/artalk.config.json) · [前端 API](https://artalk.js.org/zh/develop/fe-api.html) · [事件](https://artalk.js.org/zh/develop/event.html) · [官方 OpenAPI](https://github.com/ArtalkJS/Artalk/blob/master/docs/swagger/swagger.yaml)

## 文章标识与迁移

默认键是 `comments.keyPrefix + encodeURIComponent(commentId || 文章ID) + '/'`。默认前缀 `/posts/`，**不自动带域名或 SITE_BASE**。所以更换标题、从根域移动到 `/Nekomi/`、更换域名不会自动创建新线程。多个站点共用后端时设置各自前缀 / 站点或仓库，避免碰撞。

修改 Markdown 文件名 / ID 时保留原评论 ID：

```yaml
commentId: original-post-id
```

迁移之前已按 URL 建立的评论，显式保持原键：

```yaml
commentPath: /old/path.html
```

Waline / Artalk 也可显式保存旧的完整 HTTP(S) URL；Twikoo 官方要求不含域名的路径，配置为完整 URL 会在构建时给出明确错误。不要随意改 keyPrefix。所有公开文章的评论键必须唯一，重复会构建失败，防止串帖。

最新评论按服务返回的稳定键匹配当前 Content Collection，再生成本站真实文章链接；未知文章、草稿、已关闭评论的文章不会出现。内置适配器不宣称逐条评论定位能力，因此不伪造具体评论 Hash。自定义适配器实现 locate 后可支持 `#comment-<id>`，即使初始懒加载也会正确挂载后定位。

部分服务把 path / pageKey 同时作为服务端通知链接来源。配置服务端 SITE_URL / 站点 URL 时考虑项目子路径；修改文章 URL 后保留主机重定向或旧路由，并按服务的迁移工具处理旧链接。Nekomi 能保持线程标识和本站列表映射，不能自动重写远程数据库中的邮件链接或历史讨论内容。

`comments.items` 只保留**明确 demo:true 的静态预览兼容**，显示“示例留言”；动态服务完全忽略该数组。非 demo 旧数据会给出迁移提示，应导入相应服务。它不是正常站点最近评论的数据来源。anchorsEnabled 只用于旧预览，不控制动态适配器能力。

## 生命周期、隐私与资源

评论 SDK 位于独立同源 iframe 文档，隔离样式、事件域与框架运行状态；Nekomi 本身仍是 Astro + 原生 TypeScript / JavaScript + MDUI，没有新增 Vue / React npm 框架。服务 SDK 可能内含其自身 UI 框架，仅按需加载。Waline / Artalk 调用公开 destroy，并销毁上下文；Twikoo 无公开销毁 API 时整个上下文释放；Giscus 移除托管 iframe 与外层桥接文档。

iframe 的 allow-scripts + allow-same-origin **不是对恶意 SDK 的安全沙箱**。仅启用可信服务、资源和自定义模块。默认固定版本 / SRI 可校验三个 npm SDK，覆盖脚本时需配套正确 integrity；自托管可使用项目内 public 资源地址。Twikoo 默认 CSS 内联，覆写样式可配套使用其 nocss 产物；Giscus 样式由其服务管理。

第三方服务会接收 IP、评论文章键及 SDK 需要的请求信息，也可能加载头像、验证码、OAuth 等资源；各服务的隐私政策、Cookie、CSP 与跨域策略由部署者审查。Nekomi 自己的只读公开查询 credentials:omit，不发送管理凭据。默认不自动发言，不把原始第三方 HTML 插入侧栏；预览经过 inert template 提取文本，再用 textContent 输出，头像只接受 HTTP(S)。SDK 内部正文渲染依赖服务自身的安全实现。

API 密钥、管理密码、数据库连接串、PAT / GitHub App 私钥**不能放入 site.config.json、Frontmatter、PUBLIC_ 环境变量或自定义浏览器模块**。全部前端配置和产物都是公开的。需要保密签名 / 鉴权的动作由独立服务或自有代理执行；用户认证、审核、反垃圾和权限检查都在服务端，不由主题实现。

iframe 可能受服务端 frame-ancestors / X-Frame-Options、第三方登录、弹窗与移动浏览器策略限制。请在自己的真实部署验证这些流程；不可用时检查服务端允许域名和嵌入策略。当前自动化使用真实 SDK 资源、受控 API 响应及 Giscus 消息对端，没有实际部署服务或操作真实账号、OAuth、邮件、审核和腾讯云资源。

开发扩展见 [CommentAdapter 开发说明](COMMENT-ADAPTERS.md)，验证范围见 [测试结果](../tests/RESULTS.md)。

## 独立页面与侧栏常驻

独立 Markdown 页面默认关闭评论，显式 `comments:true` 后使用相同适配器；身份来自 `CommentContent`，并使用独立的 `comments.pageKeyPrefix`（默认 `/pages/`），不伪造文章字段。[页面写作与身份迁移](PAGES.md#页面评论)。原 `CommentPost` 类型名称和 `context.post` 参数为向后兼容保留；挂载上下文也提供 `content` 别名，kind 可为 page。

最新版查询可同时包含已启用评论的文章和页面，链接使用各自真实 URL。草稿、关闭评论和未知内容仍过滤。把最近评论设为 standalone 后按可见性加载，未打开的手机 Drawer 不查询；重复进入复用同一查询缓存，页面评论实例则随活动阅读区清理。[侧栏配置](SIDEBAR.md)。
