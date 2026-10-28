# 角色装饰、站点图标与移动端壁纸

角色装饰默认关闭，没有内置角色素材，也不会默认请求个人图床。请自行准备拥有使用权限的透明 PNG / WebP 等图片。这里只提供布局接口，没有复制 Cuckoo 的代码、样式或素材。

将文件放入 `public/images/`，在配置中使用 `/images/xxx.webp`；也可使用无认证信息的 HTTPS URL。本地路径自动加上部署子路径，**不要**写 `public/` 前缀。外链会向图片站点发送请求，可靠性与隐私取决于该站点，建议自行托管。

## 最小配置

图片名需要替换为自己的资源；也可复制 [配置示例](../examples/decorations.config.json)。与自己的配置合并，不必替换整份配置。

```json
{
  "site": {
    "favicon": "/icons/favicon.png",
    "appleTouchIcon": "/icons/apple-touch-icon.png"
  },
  "appearance": {
    "decorations": {
      "sidebar": {
        "enabled": true,
        "light": "/images/sidebar.webp",
        "dark": "",
        "width": 200,
        "opacity": 0.85,
        "align": "right",
        "offsetX": 0,
        "offsetY": 0,
        "mobile": false
      },
      "comments": {
        "enabled": true,
        "light": "/images/comments.png",
        "width": 144,
        "opacity": 0.85,
        "mobile": false
      }
    }
  },
  "layout": { "recentPostsLimit": 5, "friendsPreviewLimit": 5 }
}
```

评论装饰需要另外配置可工作的动态[评论服务](COMMENTS.md)。`none`、站外讨论链接模式 `link`，以及文章 `comments: false` 均不会输出评论装饰。装饰不改变适配器接口。

## 参数与布局

两种装饰使用相同字段；默认值与校验范围也见 [配置参考](CONFIGURATION.md)。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `false` | 显式启用；单独填图片不启用 |
| `light` / `dark` | `""` | 两种主题的图片；深色未填复用浅色，仅填深色也可复用 |
| `width` | 侧栏 200，评论 144 | 期望宽度，64–320px；空间不足会缩小 |
| `opacity` | `0.85` | 0–1；0 不输出元素 |
| `align` | `"right"` | `right` 或 `center`，在自己的装饰区域内对齐 |
| `offsetX` / `offsetY` | `0` | -64–64px；正值向右 / 下，受安全边界约束 |
| `mobile` | `false` | 1120px 以下是否允许在 Drawer / 评论区显示 |

侧栏图排在头像、搜索、Tabs、自定义链接和主题设置**之后**，靠近视口底部。保持比例，最高 320px，不加背景、描边或新滚动层。剩余空间不足 120px、偏移后图片不足 64px 宽，或 Drawer 没有空间时隐藏；文章或最新评论增加导致内容变长时也会重新计算。不要为了立绘常显而减少必要内容。

评论区在自身可用宽度达到 680px 时使用独立右栏，装饰栏最多占 25%，其余宽度留给评论控件。空间不足时退化到评论框**上方**的普通装饰，最高 160px；窄屏显式开启后最高 104px、最宽 112px。偏移在评论区收敛到水平 ±16px、垂直 ±32px，并预留对应空间；不会穿过 iframe、查找第三方编辑器或把图叠在输入框内。如果自有挂载容器出现横向溢出，也会自动改为上方布局，把宽度还给评论；不读取第三方内部结构。不同服务编辑器高度不同，不能保证与某一私有输入字段精确对齐。

图片没有交互、替代文字和键盘焦点，也不会拦截点击与触摸。评论加载中或失败时不展示图片；图片本身失败则隐藏并去掉占位，不影响评论与重试。离开文章取消图片回调和观察器；侧栏随公共 DOM 保持，切换同一图片来源不会重新加载。仅使用轻微淡入，并遵守减少动态设置。

## 站点图标

`site.favicon` 和 `site.appleTouchIcon` 可省略或留空，分别自动使用主题内置的正式 `/favicon.svg` 与 180×180 `/apple-touch-icon.png`，不需要手动写入默认路径。两项均可通过本地文件或 HTTPS URL 单独覆盖，自动适配部署 base；PNG / ICO / SVG 可用于 Favicon，Apple 图标建议 180×180 PNG。资源按原样发布，不在构建时抓取外链。图标与 `site.avatar` 独立，不会替换用户头像。[配置与缓存说明](CONFIGURATION-GUIDE.md#浏览器与设备图标) · [正式品牌资源](BRANDING.md)

## 移动端壁纸

```json
{
  "appearance": {
    "wallpaper": {
      "enabled": true,
      "light": "/images/wallpaper.jpg",
      "dark": "/images/wallpaper-dark.jpg",
      "mobileLight": "/images/wallpaper-portrait.jpg",
      "mobileDark": "/images/wallpaper-portrait-dark.jpg"
    }
  }
}
```

1120px 以下选择移动端来源。未配置 `mobileLight` 时回退 `light`；未配置 `mobileDark` 时先回退桌面 `dark`，再到 `light`。仅有移动浅色图时深色也可使用它。选源变化才加载新图；内部导航继续保持同一壁纸层和已加载图像。保留原有遮罩、缓存、渐入和加载失败回退，不会构建时固定随机 API。

`layout.recentPostsLimit` 和 `layout.friendsPreviewLimit` 默认均为 5，可设 0–12。0 隐藏对应 Tab，不留空列表；不删除文章、友链或影响独立友链页。
