---
{
  "title": "把 MD3 色板用在博客里，而不是做成控制台",
  "excerpt": "Surface 层次、Tabs 和输入框之外，真正决定阅读体验的仍然是排版、留白与克制的颜色。",
  "date": "2026-10-17",
  "category": "设计",
  "tags": [
    "MDUI",
    "设计系统"
  ],
  "cover": "",
  "demo": true
}
---

博客里的颜色首先要服务内容。阅读页面里的颜色需要帮助区分信息，同时给长时间阅读留下安静的背景。Material Design 3 的语义角色提供了一个可维护的起点。

## 先选角色，再看颜色 {#roles}

正文使用 on-surface，辅助说明使用 on-surface-variant，链接与关键动作使用 primary。这样在明暗模式下，不必为每一个元素分别挑选颜色。颜色角色描述的是关系，而不是某个固定的十六进制值。

> 只有在层次需要被看见时，才增加一层容器。

## 让背景保留连续性 {#surfaces}

侧栏与正文可以共享页面背景，文章列表则用轻微的轮廓建立分组。不要给所有区域都套上厚重卡片；留白、标题和间距已经能表达很多层次。

<ul><li>站点信息与页面自然连接。</li><li>交互容器使用组件提供的状态层。</li><li>正文中的引用和代码保留克制的强调。</li></ul>

### 在正文样式中使用令牌 {#tokens}

```css
.prose a {
  color: rgb(var(--mdui-color-primary));
  text-underline-offset: 4px;
}

.prose blockquote {
  color: rgb(var(--mdui-color-on-surface-variant));
}
```

## 切换主题后重新阅读 {#review}

深色模式需要检查正文、引用、代码和表格之间的关系，而不是把背景翻成黑色就结束。分别在浅色、深色与跟随系统三种模式下读完一段长文，确认辅助说明仍清楚、链接仍容易辨认、键盘焦点仍可见。

具体组件属性与颜色角色请以 [MDUI 官方 Design Tokens 文档](https://www.mdui.org/zh-cn/docs/2/styles/design-tokens)为准。语义角色让自定义排版与组件保持一致，也能减少主题切换时的单独补色。
