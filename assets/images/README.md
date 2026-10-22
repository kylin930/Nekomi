# 图片接入说明

本版刻意没有生成头像、文章封面、插画或默认动漫头像。所有图片位都已有缺失状态，站长后续提供素材后按下述方式接入即可。

## 头像

1. 将图片放到本目录，例如 `avatar.webp`。
2. 修改 [`../js/data.js`](../js/data.js)：

```js
site: {
  avatar: 'assets/images/avatar.webp',
  avatarAlt: '小林的小窝站点头像',
  avatarFallback: '林'
}
```

未提供 `avatar` 时，侧栏显示「林」字文字头像；图片加载失败时也会自动回退到文字。

建议：正方形、至少 160×160，使用 WebP/AVIF；保证图片授权清晰。

## 文章封面

在任意文章上填写 `cover`：

```js
{
  id: '...',
  title: '...',
  // ...
  cover: 'assets/images/covers/example.webp'
}
```

- 有封面：图片位于原生 MDUI Card 顶部，在桌面与手机端均随可用宽度缩放，高度不超过 280px。
- 无封面：不渲染图片区域，卡片为完整纯文本布局。
- 图片加载失败：自动移除封面并回到纯文本布局，不会留下空矩形。

建议：16:10 左右，宽度 800px 以上，使用 WebP/AVIF。

## 友链头像

```js
friends: [
  {
    name: '站点名称',
    url: 'https://example.com/',
    avatar: 'assets/images/friends/example.webp',
    description: '一句简短介绍'
  }
]
```

未提供头像时使用原生 MDUI Avatar 显示站点名首字；加载失败时也回退为文字。

## 许可

请只使用你拥有授权或明确许可的图片；不要把第三方主题、动漫作品或图库素材直接复制进项目。
