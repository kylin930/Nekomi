# 编写 CommentAdapter

这是浏览器前端扩展接口，不是服务端插件系统。模块在 Astro / Vite 构建中解析、按需加载；生产仍输出纯静态文件。无需修改 runtime.js、registry.ts 或维护第二套路由。

## 选择模块

把自有代码放在 `src/custom/my-comments.ts`，配置：

```json
{
  "comments": {
    "provider": "custom",
    "custom": {
      "module": "./src/custom/my-comments.ts",
      "options": { "endpoint": "https://comments.example.com/" }
    }
  }
}
```

路径相对项目根，允许 .ts / .js / .mjs，必须是项目内存在的文件（不能通过 ../ 或符号链接读取项目外模块）。不接受运行时任意远程 ESM URL。公开配置只传公共信息；options 中的内容会出现在静态产物，不能存放私钥。

可以先使用 [完整、可构建的 REST 示例](../examples/comments/rest-adapter.ts) 和 [配套配置](../examples/comments/custom.config.json)。示例实际查询 / 渲染列表、统计、更新主题、销毁和定位，是**只读范例**；发表、登录、编辑与审核应按你自己的服务协议实现，没有规定数据库或账户系统。

## 公共类型与工厂

从 `src/integrations/comments/index.ts` 导入类型 / 文本处理工具。模块默认导出 CommentAdapterFactory：

```ts
import type { CommentAdapterFactory } from '../integrations/comments';

const createAdapter: CommentAdapterFactory = settings => ({
  id: 'my-comments',
  capabilities: { theme: true, count: false, recent: false, locate: false },
  async mount(context) {
    const { container, post, signal, theme } = context;
    // 根据 post.key 请求你的服务；在 await 后检查 signal，再更新这个 container。
    signal.throwIfAborted();
    const view = document.createElement('p');
    view.textContent = '评论组件';
    container.append(view);
    return {
      setTheme(nextTheme) { view.dataset.theme = nextTheme.dark ? 'dark' : 'light'; },
      destroy() { view.remove(); },
    };
  },
});
export default createAdapter;
```

这段只是生命周期最小示意；真实网络示例请看 REST 文件。编写自己的表单时仍使用 MDUI 的适用控件，数据鉴权由独立服务负责。

| 接口 | 含义 |
| --- | --- |
| id | 适配器名称，不是文章键 |
| capabilities.theme | 是否支持主题更新；true 时必须返回 setTheme |
| capabilities.count | false / query / live；query 必须实现 getCount；live 通过 context.onCount 上报当前实例权威计数 |
| capabilities.recent | 是否提供全站最近查询；true 必须实现 getRecent |
| capabilities.locate | 是否能定位具体评论；true 时必须返回 locate |
| mount(context) | UI 可以响应操作后 resolve CommentInstance；后续分页由自身实现 |
| instance.destroy() | 必须实现，可重复调用的清理；释放 DOM、请求、监听、定时器、观察器、SDK |
| instance.setTheme(theme) | 可选，theme 能力为 true 时必需；不重置文章键或未发送草稿 |
| instance.locate(id) | 可选，locate 能力为 true 时必需；查找真实评论并处理焦点 / 滚动 |
| getCount({post,signal,base}) | 返回非负有限数字，不可用时 reject，不能用 0 伪装失败 |
| getRecent({posts,limit,signal,base}) | 返回 RecentComment[]，没有评论时 []，失败时 reject |

能力未知 / 声明与实现不一致会显示失败。没有 recent 时显示不可用状态，不调用不存在的方法；Giscus 这类已知无最近接口的内置服务在 SSR 阶段直接隐藏该页签。

## 上下文

- container：本次挂载的 DOM 容器。只向该容器添加 UI，不能复用旧页面容器。
- post.id：当前 Content Collection ID。
- post.key：稳定线程键，已应用 commentId / commentPath / keyPrefix。
- post.url：带部署 base 的当前文章链接；需要绝对地址时使用 `new URL(post.url, location.origin).href`。
- post.title：当前显示标题，不得用作唯一线程键。
- theme.mode：light / dark / auto；theme.dark 是当前实际深浅；theme.tokens 可提供字体、文字和主色。
- signal：本次挂载的生命周期和初始化预算信号。传入 fetch，监听中断并停止自身工作。
- base：站点部署路径，例 /Nekomi/。
- onCount(value)：live 计数，迟到 / 负数 / 无效数字被忽略。
- onError(error)：已挂载后发生不可恢复错误时报告，让主题清理并提供重试。

主题为适配器提供独立配置副本和只读文章快照。不要依赖可变的 window.location.pathname 作为线程键；尤其内置 SDK 文档在内部 iframe 中运行，SDK 的显式 path 必须保留。

## 最近数据

```ts
interface RecentComment {
  id: string;
  key: string;
  author: string;
  excerpt: string; // 纯文本
  createdAt: string; // 带时区 ISO 时间
  avatar?: string; // HTTP(S)，可省略
}
```

用 key 匹配 posts 中的已发布文章，主题负责生成当前 URL。不要把来自 API 的任意 URL 直接用作本站文章链接。未知 / 草稿 / 关闭评论的文章会被过滤。

REST 示例约定 GET /recent?limit=N 返回上述数组，GET /count?key=... 返回 `{ "count": 1 }`，GET /comments?key=... 返回 `{id,author,text}[]`。这只是示例协议，可在你自己的适配器中映射其他字段。公共工具 commentText / normalizeRecentComment 使用 inert template 提取文本，不采用第三方 HTML 节点；输出 UI 使用 textContent。不要在自定义模块用 innerHTML 渲染未信任的评论。

locate:true 会生成 `#comment-<encodeURIComponent(id)>`。直接打开此 Hash 会绕过视口等待，先挂载再调用 locate；同文档 Hash / 历史也会调用。只有确实能够显示 / 加载并聚焦目标评论时才声明该能力，不能拿“滚到评论区”冒充逐条定位。

## 生命周期与取消

1. 首次需要时创建工厂与适配器；整个文档复用适配器定义。
2. 当前文章进入视口 / 指向评论 Hash 时 mount 一次。主题先显示加载状态。
3. 返回实例后更新到最新主题；查询计数是独立任务，失败不把 SDK 编辑器一起隐藏。
4. 离页、超时或重试会中断 signal、清理容器并销毁实例。Astro 的持久化壁纸 / Sidebar / Drawer 不被替换。
5. 异步 mount 在取消后才返回，返回的实例也会立即 destroy；迟到的 onCount / onError 不会覆盖新文章。
6. 每次文章切换获得新的容器 / signal。不要在模块顶层缓存页面 DOM，也不要在每次 mount 为 window 注册无法释放的全局监听。

destroy 应幂等。推荐事件监听传 `{ signal }`，fetch 传 signal；定时器、ResizeObserver、第三方 SDK 必须显式取消。没有可靠销毁 API 的 SDK 可采用独立 iframe，通过销毁浏览上下文释放资源；这只是资源 / 样式隔离，不是安全边界。

不能协作取消的代码也应在每个 await 后检查 signal。主题处理迟到返回实例作为最后防线，不能替任意第三方模块回收它偷偷加在 document.body 上的对象。

## 安全与开发测试

认证、审核、反垃圾、CSRF / 权限检查属于服务器。需要私密凭据时创建独立服务代理，不能把 API key、管理 token 或私钥传入浏览器。跨域 Cookie / Bearer 用户会话由自有服务设计；主题默认公开查询不带管理凭据。

`npm run check` 检查 TS；`node --test tests/comments.test.mjs` 校验配置 / 身份；`python3 tests/comments_audit.py --stress` 使用真实 SDK 和 API 回放；`python3 tests/comments_edges.py` 覆盖关闭、空文章、稳定键、无能力、自定义超时迟到与构建错误。测试本地静态产物，不要求 Node 后端。进一步回归命令见 CONTRIBUTING。

更新主题时保留 src/custom、site.config.json、Markdown 与自有资源，审阅类型 / CHANGELOG 变更。此接口的源码入口和生命周期是扩展契约；不要依赖内置适配器内部的 SDK DOM 或私有方法。
