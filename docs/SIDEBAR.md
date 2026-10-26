# 侧栏 Tabs 与常驻模块

桌面侧栏和移动 Drawer 使用同一份配置。[完整配置参考](CONFIGURATION.md#layout) · [组合示例](../examples/site-features.config.json)

## 保留旧布局

不设置 `layout.sidebarSections`（或设为 `null`）时，严格沿用现有 `layout.sidebarTabs` 的顺序与显示规则。`layout.modules` 继续排列 profile / social / search / tabs；其中 `tabs` 是整个补充内容区域的插槽，不只是 Tab 导航栏。移除它会隐藏下面的新旧侧栏内容区域。

## 把友链放在 Tabs 下方

```json
{
  "layout": {
    "sidebarSections": [
      { "id": "updates", "display": "tab" },
      { "id": "comments", "display": "tab" },
      { "id": "friends", "display": "standalone", "position": "below" }
    ]
  }
}
```

`tab` 进入可切换区域；`standalone` 常驻，`position` 支持 `above / below`，省略时为 below。各组内部按数组顺序显示。独立模块保留原来的列表、预览限制、头像和入口，不添加卡片背景，也不随 Tab 切换卸载。

新数组提供后完整替代 `sidebarTabs`；同一模块最多一次，未知 ID、重复项或给 tab 设置 position 都会报错。全部使用 standalone 时不输出空 Tabs，`[]` 隐藏这个内容区域。模块名称仍使用 `ui.sidebar`，最近文章 / 友链数量仍使用已有两个 preview limit，不新增重复开关。

## 最新评论的加载

Tab 模式保持原来的激活加载。Standalone 模式使用可见性与 `comments.lazy`：默认在模块接近视口时加载；lazy=false 时在当前可见侧栏上下文主动加载。移动 Drawer 未打开时不查询。桌面 / 手机复用同一份短期缓存和进行中的请求，关闭或切换到不可见状态时取消请求，不轮询。

服务关闭、recent=false 或内置服务不支持最新查询时不渲染模块；自定义服务运行时声明不支持时移除该模块及空 Tab 栏。未配置评论服务的组合示例会隐藏“最近评论”，这是正常关闭状态，不会生成假留言。
