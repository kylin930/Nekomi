---
{
  "title": "用 CSS Grid 搭一个稳定的两栏博客布局",
  "excerpt": "从 280px 侧栏和自适应正文开始，把间距、断点与内容密度一次理清。写布局时先把结构定下来，再处理视觉细节。",
  "date": "2026-10-20",
  "category": "前端",
  "tags": [
    "CSS",
    "布局"
  ],
  "cover": "",
  "demo": true
}
---

这是一篇用于验证 Nekomi 阅读体验的技术演示文章。我们从一个普通的两栏博客出发，讨论侧栏、正文和目录如何共享空间。文中的数值只是起点，最终仍要拿真实内容和不同宽度的屏幕来检查。

一个布局是否稳定，往往要等标题变长、代码溢出、图片缺席时才看得出来。先把这些情况放进页面，比在空白卡片上调阴影更有帮助。

## 先确定内容的边界 {#layout}

博客首页需要让人快速浏览，文章页则需要让人持续阅读。两种页面可以共用侧栏和颜色，但正文区域不必使用相同的宽度。中文长文的行宽、字号和行高应该一起调整：在桌面端留出舒展的空间，在手机上保留足够的左右边距。

> 把空间先交给内容，再给辅助信息安排位置。没有目录的位置时，就把目录折叠到正文之前。

### 为什么要写 minmax(0, 1fr) {#grid-minimum}

Grid 项目的默认最小尺寸会受到内容影响。长 URL、没有换行的代码和宽表格，都可能把本应自适应的列撑大。使用 `minmax(0, 1fr)`，再把横向滚动留给代码块和表格自身，通常更容易控制。

```css
.page {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  gap: 40px;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 32px;
}

.article {
  min-width: 0;
  max-width: 760px;
}

pre {
  overflow-x: auto;
}
```

这段代码只负责布局。按钮的状态、抽屉的焦点约束和折叠组件的动画，应交给 MDUI 原生组件处理。让自定义 CSS 的职责清楚，后续排查问题也会容易一些。

#### 嵌套内容也需要边界 {#nested-layout}

外层 Grid 已经允许收缩，并不意味着里面的所有元素都会自动缩小。文章中的 `figure`、代码容器和表格包装层也需要正确的最小宽度与溢出策略。检查时可以先给布局画出轮廓，找到真正撑开页面的那一层。

<ul><li>正文列设置 <code>min-width: 0</code>。</li><li>图片使用 <code>max-width: 100%</code>，保留自然比例。</li><li>代码保留原始换行，并允许横向滚动。</li><li>表格单独包裹滚动区域：<ul><li>保留表头与标题的语义。</li><li>让键盘用户也能聚焦并滚动。</li></ul></li></ul>

## 断点由内容决定 {#responsive}

在宽屏上，融入式侧栏、正文与右侧目录可以同时存在。当宽度不足时，先收起辅助目录，再把左侧栏交给移动端 Navigation Drawer。不要为了保住三列结构，把正文挤成一条狭长的带子。

<div><table><caption>布局决策示例：不同空间下的内容优先级</caption><thead><tr><th scope="col">空间</th><th scope="col">侧栏</th><th scope="col">文章正文</th><th scope="col">目录</th><th scope="col">需要检查的内容</th></tr></thead><tbody><tr><th scope="row">宽屏桌面</th><td>融入页面，独立滚动</td><td>限制最大行宽，保持阅读节奏</td><td>右侧粘性辅助区域</td><td>长标题、侧栏底部按钮与目录滚动</td></tr><tr><th scope="row">普通桌面</th><td>保留站点资料与搜索</td><td>优先分配剩余空间</td><td>正文前的可折叠目录</td><td>代码块与表格不能撑开页面</td></tr><tr><th scope="row">手机</th><td>使用原生模态抽屉</td><td>单列，保留安全边距</td><td>可折叠，支持多级标题</td><td>触摸、键盘、锚点与浏览器返回</td></tr></tbody></table></div>

### 拿实际页面做检查 {#check-real-page}

下图使用本项目自己的首页截图，作为正文图片的排版样本。它不是新的视觉素材，也不代表文章必须配置头图。正文插图和首页封面是两个独立的内容决策。

<figure><img src="/images/demo-home.png" alt="Nekomi 首页：融入式侧栏与右侧文章列表" width="1440" height="900"><figcaption>排版样本：Nekomi P0 首页截图。图片随正文宽度缩放。</figcaption></figure>

除了正常尺寸的图片，还应验证图片无法加载的情况。替代文本应该描述图中与上下文有关的信息。装饰图片可以使用空的替代文本，但承载内容的图片应保留说明。

## 让导航状态可以分享 {#state}

目前还没有选定静态生成器，用 `article.html?post=css-grid-two-column-blog` 作为演示路由已经足够。页面刷新后，应从 URL 找到文章；目录锚点则继续使用浏览器熟悉的 `#section`。

```javascript
const params = new URLSearchParams(location.search);
const postId = params.get('post');
const post = posts.find(item => item.id === postId);

if (!post) {
  showNotFound();
} else {
  renderArticle(post);
}

// 故意保留的长代码行：用于检查横向滚动，复制时应保持完整内容。
const example = 'https://example.com/articles/a-very-long-readable-identifier?layout=sidebar-and-reading-area&theme=follow-system&source=nekomi-reading-demo&check=horizontal-overflow';
```

页面切换可以加上短促的非线性滑入过渡，让方向感更自然。对于设置了减少动态效果的读者，直接显示内容会更合适。动画不应阻止链接正常打开，也不应改变浏览器前进后退的语义。

### 用键盘检查一次 {#keyboard}

<ol><li>通过跳转链接进入主内容区。</li><li>使用 <kbd>Tab</kbd> 找到目录链接，再按 <kbd>Enter</kbd> 跳转。</li><li>确认目标标题获得焦点，并且没有被手机 App Bar 遮挡。</li><li>返回上一条历史记录，检查 URL 与章节位置。</li><li>聚焦代码区域，用方向键查看超出屏幕的内容。</li></ol>

---

## 收尾：把简单的约定留下来 {#finish}

元数据负责标题、日期和索引；正文负责内容；页面组件负责交互；CSS 负责布局与排版。四者的边界不需要复杂的框架才能建立。未来换成静态生成器时，可以让模板直接输出这些语义元素，把今天验证过的阅读样式保留下来。

进一步阅读：[MDN 的 Grid 布局文档](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout)与[MDUI 2 官方文档](https://www.mdui.org/zh-cn/docs/2/)。长链接也应该能够正常断行，例如：[https://example.com/documentation/layout/very-long-resource-name-for-testing-responsive-chinese-article-typography](https://example.com/documentation/layout/very-long-resource-name-for-testing-responsive-chinese-article-typography)。
