---
{
  "title": "IntersectionObserver 做吸顶，比监听 scroll 更省心",
  "excerpt": "用一个哨兵元素判断 Tabs 是否吸顶，只在状态变化时更新样式，滚动过程不再反复触发布局计算。",
  "date": "2026-10-11",
  "category": "前端",
  "tags": [
    "JavaScript",
    "浏览器"
  ],
  "cover": "",
  "demo": true
}
---

这篇演示笔记讨论吸顶状态的观察。一个标题看起来固定在顶部，并不意味着需要每一帧都执行 JavaScript。

## 先试 CSS sticky {#css-first}

如果需求只是让导航停在某个位置，`position: sticky` 通常已经足够。需要注意滚动祖先的 overflow，以及固定顶部栏占用的高度。Nekomi 的首页 Tabs 使用原生组件的吸顶能力。

## 确实需要状态时，再放一个哨兵 {#sentinel}

例如只有导航吸顶后才显示边界提示，可以在导航前放置一个无视觉内容的观察点。观察回调只在交叉状态变化时执行，避免把简单的样式变化变成持续的布局计算。

```javascript
const observer = new IntersectionObserver(([entry]) => {
  nav.classList.toggle('is-stuck', !entry.isIntersecting);
}, { threshold: 0 });

observer.observe(sentinel);
// 销毁页面功能时：observer.disconnect();
```

### 观察范围需要明确 {#limits}

有独立滚动容器时，root 应指向真正的滚动区域。顶部固定元素遮挡内容时，也要检查 rootMargin。不要把一次交叉变化理解成连续的滚动进度。

## 章节高亮是另一类需求 {#section}

文章目录需要根据标题位置确定当前章节。可以使用观察器，也可以在滚动时合并到 requestAnimationFrame，并只做必要读取。应根据章节数量、边界行为和实际测试选择方式。

无论哪种方案，都要验证短章节、页面底部、直接打开锚点和浏览器返回。实现方式的名字不能代替行为验证。
