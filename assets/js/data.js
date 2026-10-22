/**
 * Nekomi — 文章元数据索引
 *
 * 重要：这里的站点资料、文章、日期、分类、标签全部是演示数据，
 * 仅用于验证首页与阅读体验，不代表真实文章或站点统计。
 *
 * 元数据配置在本文件，独立正文约定见 content/README.md：
 * - site.avatar 留空时，侧栏显示「林」字文字头像回退；
 * - post.cover 留空时，文章卡片使用纯文本布局，不渲染空图片框；
 * - friends 为空时，侧栏显示自然的友链空状态。
 */
window.NekomiData = {
  demo: true,
  demoNotice: '本页文章、日期、分类与标签均为演示数据。',

  // 全站外观：壁纸由站长提供；留空时使用主题本身的表面层次。
  appearance: {
    color: '#8064b1',
    wallpaper: {
      light: '',
      dark: '', // 留空时沿用 light；图片失败则恢复无壁纸状态。
      position: 'center'
    }
  },

  site: {
    name: '小林的小窝',
    tagline: '分享技术、日常',
    intro: '前端开发，偶尔记录生活。',
    // 示例：assets/images/avatar.webp；留空使用文字头像回退。
    avatar: '',
    avatarAlt: '小林的小窝站点头像',
    avatarFallback: '林'
  },

  // 友链留空，避免编造真实站点或站长资料。
  // 有数据时格式：{ name, url, avatar, description }
  friends: [],

  posts: [
    {
      id: 'css-grid-two-column-blog',
      content: 'content/posts/css-grid-two-column-blog.html',
      title: '用 CSS Grid 搭一个稳定的两栏博客布局',
      excerpt: '从 280px 侧栏和自适应正文开始，把间距、断点与内容密度一次理清。写布局时先把结构定下来，再处理视觉细节。',
      date: '2026-10-20',
      category: '前端',
      tags: ['CSS', '布局'],
      cover: ''
    },
    {
      id: 'md3-palette-for-blog',
      content: 'content/posts/md3-palette-for-blog.html',
      title: '把 MD3 色板用在博客里，而不是做成控制台',
      excerpt: 'Surface 层次、Tabs 和输入框之外，真正决定阅读体验的仍然是排版、留白与克制的颜色。',
      date: '2026-10-17',
      category: '设计',
      tags: ['MDUI', '设计系统'],
      cover: ''
    },
    {
      id: 'lightweight-page-state',
      content: 'content/posts/lightweight-page-state.html',
      title: '原生 JavaScript 的页面状态可以有多轻',
      excerpt: '用一份数据源驱动文章列表、最近更新、搜索和归档，不引入框架，也能让状态流向保持清楚。',
      date: '2026-10-14',
      category: '前端',
      tags: ['JavaScript', '状态管理'],
      cover: ''
    },
    {
      id: 'intersection-observer-sticky',
      content: 'content/posts/intersection-observer-sticky.html',
      title: 'IntersectionObserver 做吸顶，比监听 scroll 更省心',
      excerpt: '用一个哨兵元素判断 Tabs 是否吸顶，只在状态变化时更新样式，滚动过程不再反复触发布局计算。',
      date: '2026-10-11',
      category: '前端',
      tags: ['JavaScript', '浏览器'],
      cover: ''
    },
    {
      id: 'chinese-typography-checklist',
      content: 'content/posts/chinese-typography-checklist.html',
      title: '写给自己的中文排版检查清单',
      excerpt: '字号、行高、行宽和标点，先让文章读起来舒服，再谈视觉风格。附一份每次改版都会重看的检查项。',
      date: '2026-10-08',
      category: '设计',
      tags: ['排版', 'CSS'],
      cover: ''
    },
    {
      id: 'no-image-state',
      content: 'content/posts/no-image-state.html',
      title: '无图状态也是布局的一部分',
      excerpt: '封面缺席时，文章卡片不应该留下空白矩形，也不该用占位插画填满。让纯文本布局同样完整、可读。',
      date: '2026-10-04',
      category: '前端',
      tags: ['图片', '性能'],
      cover: ''
    },
    {
      id: 'keyboard-focus-notes',
      content: 'content/posts/keyboard-focus-notes.html',
      title: '用键盘走完一个首页：焦点管理笔记',
      excerpt: 'Tabs、搜索、抽屉和对话框，每个交互都需要看得见的焦点与合理的返回路径。',
      date: '2026-09-29',
      category: '前端',
      tags: ['无障碍', 'JavaScript'],
      cover: ''
    },
    {
      id: 'three-albums-recently',
      content: 'content/posts/three-albums-recently.html',
      title: '最近在听的三张专辑',
      excerpt: '没有主题，只是把最近循环的几张唱片记下来。通勤路上和深夜写代码时听的，往往是同一批。',
      date: '2026-09-24',
      category: '日常',
      tags: ['音乐', '生活'],
      cover: ''
    },
    {
      id: 'weekend-walk-by-river',
      content: 'content/posts/weekend-walk-by-river.html',
      title: '周末沿着江边走了很久',
      excerpt: '天气转凉之后，城市的声音好像也慢了下来。没有目的地的散步，反而更容易记住一些细节。',
      date: '2026-09-18',
      category: '日常',
      tags: ['生活', '散步'],
      cover: ''
    },
    {
      id: 'static-blog-structure',
      content: 'content/posts/static-blog-structure.html',
      title: '静态博客的目录结构：先够用，再生长',
      excerpt: '数据、渲染和样式分开，后续换成模板引擎或静态生成器时，也不用把整个项目推倒重来。',
      date: '2026-09-12',
      category: '工程',
      tags: ['工程', '静态站点'],
      cover: ''
    }
  ]
};
