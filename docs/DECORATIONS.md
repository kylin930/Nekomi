# 角色装饰、站点图标与移动端壁纸

角色装饰是可选的透明图片，默认关闭，主题不内置角色素材，也不会请求个人图床。请自行准备拥有使用权限的 PNG / WebP 等图片。

图片放在 `public/images/`，配置使用 `/images/xxx.webp`；也可以使用无认证信息的 HTTPS 地址。本地路径会自动补部署子路径，不要写 `public/` 前缀。外链会向图片站点发送请求，可靠性与隐私取决于该站点，建议自行托管。

## 三步启用

1. 把图片放入 `public/images/`。
2. 在 `appearance.decorations` 中启用侧栏或评论装饰。
3. 重新构建并检查桌面与手机布局。

```json
{
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
  }
}
```

图片名需要替换为自己的资源；也可以复制 [配置示例](../examples/decorations.config.json)，再合并到现有配置。

评论装饰需要另外配置可工作的[评论服务](COMMENTS.md)。`provider: none`、站外讨论链接模式 `link`，以及文章 `comments: false` 都不会输出评论装饰。

## 参数

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `false` | 显式启用；只填图片不会启用 |
| `light` / `dark` | `""` | 两种主题的图片；深色未填复用浅色，仅填深色时两种模式都用它 |
| `width` | 侧栏 200，评论 144 | 期望宽度，64–320px；空间不足会缩小 |
| `opacity` | `0.85` | 0–1；0 不输出元素 |
| `align` | `"right"` | `right` 或 `center`，在装饰区域内对齐 |
| `offsetX` / `offsetY` | `0` | -64–64px；正值向右 / 下，受安全边界约束 |
| `mobile` | `false` | 1120px 以下是否在 Drawer / 评论区显示 |

## 布局规则

### 侧栏装饰

- 排在头像、搜索、Tabs、自定义链接和主题设置之后，靠近视口底部。
- 保持比例，最高 320px，不加背景、描边或新滚动层。
- 剩余空间不足 120px、偏移后图片不足 64px 宽，或 Drawer 没有空间时隐藏。
- 文章或最新评论增加导致内容变长时会重新计算。

### 评论装饰

- 评论区可用宽度达到 680px 时使用独立右栏，装饰栏最多占 25%。
- 空间不足时退化为评论框上方的普通装饰，最高 160px。
- 窄屏显式开启后最高 104px、最宽 112px，偏移收敛到水平 ±16px、垂直 ±32px。
- 不会穿过 iframe、查找第三方编辑器或把图叠在输入框内；自有挂载容器横向溢出时自动改为上方布局。
- 评论加载中或失败时不展示图片；图片失败则隐藏并去掉占位，不影响评论与重试。

图片没有交互、替代文字和键盘焦点，也不会拦截点击与触摸。仅使用轻微淡入，并遵守减少动态设置。

## 站点图标

`site.favicon` 和 `site.appleTouchIcon` 可省略或留空，分别自动使用主题内置的 `/favicon.svg` 与 180×180 `/apple-touch-icon.png`。两项都可以单独覆盖，自动适配部署 base；PNG / ICO / SVG 可用于 Favicon，Apple 图标建议 180×180 PNG。

图标与 `site.avatar` 独立，不会替换用户头像。详见[图标配置](CONFIGURATION-GUIDE.md#浏览器与设备图标)与[品牌资源](BRANDING.md)。

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

1120px 以下使用移动端来源。未配置 `mobileLight` 时回退 `light`；未配置 `mobileDark` 时先回退桌面 `dark`，再到 `light`。只有移动浅色图时深色也能使用。选源变化才加载新图，内部导航继续保持同一壁纸层和已加载图像。

## 预览数量

`layout.recentPostsLimit` 和 `layout.friendsPreviewLimit` 默认均为 5，可设 0–12。设为 0 会隐藏对应 Tab，不留空列表，不影响文章、友链或独立友链页。
