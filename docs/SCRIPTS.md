# 自定义 JavaScript

默认不加载用户脚本。适合站长接入自己信任的挂件或 SDK；这不是沙箱、CMS 或插件后台。[完整配置参考](CONFIGURATION.md#scripts) · [默认关闭的示例配置](../examples/site-features.config.json)

## 配置资源

```json
{
  "scripts": {
    "global": [
      { "src": "/js/nekomi-widget-demo.js", "type": "module", "position": "body-end", "enabled": false }
    ],
    "byPage": [
      { "path": "/about/", "src": "/js/nekomi-page-demo.js", "type": "module", "position": "head", "enabled": false }
    ]
  }
}
```

示例文件已在 public/js；开启对应 enabled 即可试用，根配置没有启用它们。自己的本地文件也放 public/，src 不含 public 前缀；自动补部署 base。外部地址只允许不带凭据的 HTTPS。配置中不接受内联代码、eval 或函数表达式。

`type` 支持 module / classic，默认 module；`position` 支持 head / body-end，默认 body-end。同区域按配置顺序加载，head 先于 body-end。两种位置都是核心运行时就绪后的异步资源加载位置，**不承诺阻塞 HTML 解析，也不用于注入主题启动前代码**。不会阻塞主题、搜索或导航。

`byPage.path` 是带前后斜杠的站内路径，不包含 base、查询或 Hash。例如子路径部署仍写 `/about/`，首页为 `/`。普通文章和内置页也可匹配。首页的 `#page-about` 是首页面板，不等于 `/about/`，不会启动该 URL 的专属脚本。

同一个资源只执行一次；重复进入时调用其生命周期，而非重复插 script。不能同时在 global 和 byPage 声明同一资源；同一资源可用于多个不同页面，但 type、position 和 integrity 必须一致。禁用项不请求资源，本地启用项不存在会在构建前报出字段路径。

## ESM 生命周期

在 `public/js/my-widget.js` 中导出具名 `mount`：

```js
/** @param {import('../../src/integrations/scripts/types').ScriptContext} context */
export function mount(context) {
  const label = document.createElement('p');
  label.textContent = '我的挂件';
  context.container.append(label);
  context.on(window, 'resize', () => {
    // 在此更新自己的挂件。
  });
  return () => label.remove();
}
```

`container` 是主题管理的挂载区；全站容器跨页面保留，页面容器在离开时移除。`signal` 在生命周期结束时取消，`context.on` 注册的监听会自动清理。另提供 `path`、`url`、`base`、`scope`；path / url 是本次 mount 的上下文，全站挂件需要监听 Astro page-load 获取后续导航变化。

mount 可以异步返回清理函数或 `{ destroy() {} }`。请把 fetch 的 signal 设为 context.signal，并将自己创建的观察器、定时器和 SDK 实例放进清理函数。15 秒资源 / mount 预算内未完成会记录诊断并清理；迟到的异步返回也会调用清理。不要在模块顶层创建页面 DOM 或永久监听，特别是 byPage 脚本。

全站脚本只 mount 一次；页面脚本每次进入 mount，实际离开时清理。浏览器前进后退使用同样的路径。顶层模块代码只执行一次，所以需要每次更新的逻辑应放入 mount。

## 经典脚本

不使用 export / import 的 classic 文件通过注册接口提供同样的生命周期：

```js
const scriptURL = document.currentScript.src;
window.NekomiScripts.register(scriptURL, {
  mount(context) {
    const node = document.createElement('p');
    node.textContent = '经典脚本挂件';
    context.container.append(node);
    return () => node.remove();
  }
});
```

在文件执行时同步注册，异步回调中 document.currentScript 可能为空。纯全站 SDK 可以只执行一次而不注册，但页面专属脚本必须提供 mount；主题无法替任意第三方顶层副作用推断清理方法。全站挂件也建议使用挂载容器，不要直接改写主题 DOM。

## 安全、完整性与边界

可选 `integrity` 使用标准 sha256 / sha384 / sha512 Base64 摘要。主题通过原生 script 标签校验入口资源，必要时使用 crossorigin=anonymous；ESM 通过浏览器模块缓存取得导出，不重复执行。外部 ESM / SRI 来源须正确提供 CORS。入口 SRI 不自动保证其所有动态依赖的完整性，依赖版本和来源仍由站长维护。

第三方 JS 具有本站完整浏览器权限，可能收集数据或修改页面；只加载受信任、有使用权的来源，不放 API 私钥或管理凭据。生命周期不是安全隔离；网络加载中的原生模块无法保证取消执行，故模块顶层应只定义函数，所有界面工作放在 mount 并检查 signal。

资源、SRI 或 mount 失败会在控制台给出 `[Nekomi scripts]` 诊断，不输出失效占位，不阻塞核心 UI；失败资源不在导航中反复下载，刷新后重试。浏览器缓存 / Astro 生命周期由主题处理，不要自行反复注册全局导航监听或插入相同挂件。不要依赖临时 head 标签在每次导航后仍存在；自有 DOM / 样式应放在 container，或自行使用受控的清理与持久化方式。

类型入口：[ScriptContext / ScriptHooks](../src/integrations/scripts/types.ts)。[ESM 全站示例](../public/js/nekomi-widget-demo.js) · [页面脚本示例](../public/js/nekomi-page-demo.js)。
