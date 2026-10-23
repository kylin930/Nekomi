/* 两个入口共用的页面外壳、侧栏、搜索入口与轻量交互。 */
(function () {
  'use strict';
  if (!window.mdui || !window.NekomiData) return;
  var data = NekomiData;
  var site = data.site;
  var posts = data.posts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  var isHome = document.body.dataset.page === 'home';
  var currentId = new URLSearchParams(location.search).get('post');
  var mobile = matchMedia('(max-width: 860px)');
  var searchValue = '';

  function html(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function safeUrl(value) {
    if (!value || !String(value).trim()) return '';
    try {
      var url = new URL(value, location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }
  function dateLabel(date) {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(date + 'T00:00:00Z'));
  }
  function icon(name, slot) {
    return '<mdui-icon name="' + name + '" aria-hidden="true"' + (slot ? ' slot="' + slot + '"' : '') + '></mdui-icon>';
  }
  function postLink(post) { return 'article.html?post=' + encodeURIComponent(post.id); }
  function filterLink(term) { return 'index.html?q=' + encodeURIComponent(term) + '#recent'; }
  function avatar(src, fallback, label) {
    return '<mdui-avatar class="site-avatar" role="img" aria-label="' + html(label) + '">' + html(fallback) +
      (safeUrl(src) ? '<img src="' + html(safeUrl(src)) + '" alt="" data-avatar>' : '') + '</mdui-avatar>';
  }
  function listItem(post, description) {
    return '<mdui-list-item rounded href="' + postLink(post) + '" data-post="' + html(post.id) +
      '" headline="' + html(post.title) + '" headline-line="2" description="' + html(description) + '"' +
      (currentId === post.id ? ' active' : '') + '></mdui-list-item>';
  }
  function chip(tag, count) {
    return '<mdui-chip variant="suggestion" data-query="' + html(tag) + '"' +
      (isHome ? '' : ' href="' + html(filterLink(tag)) + '"') + '>' + html(tag) +
      (count ? '<span class="tag-count">' + count + '</span>' : '') + '</mdui-chip>';
  }
  var friends = data.friends.filter(function (friend) { return safeUrl(friend.url); });
  function friendItem(friend) {
    var name = String(friend.name || '友邻');
    return '<mdui-list-item rounded href="' + html(safeUrl(friend.url)) + '" target="_blank" rel="noopener noreferrer" headline="' +
      html(name) + '" description="' + html(friend.description || '') + '" description-line="2">' +
      avatar(friend.avatar, Array.from(name)[0], name).replace('class="site-avatar"', 'class="friend-avatar" slot="icon"') + '</mdui-list-item>';
  }
  var commentConfig = data.comments || {};
  var comments = (Array.isArray(commentConfig.items) ? commentConfig.items : []).filter(function (comment) {
    return comment && typeof comment.author === 'string' && comment.author.trim() &&
      typeof comment.excerpt === 'string' && comment.excerpt.trim() &&
      posts.some(function (post) { return post.id === comment.postId; }) && Number.isFinite(Date.parse(comment.createdAt));
  }).sort(function (a, b) { return Date.parse(b.createdAt) - Date.parse(a.createdAt); });
  function commentItem(comment) {
    var post = posts.find(function (item) { return item.id === comment.postId; });
    var date = new Date(comment.createdAt);
    var time = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    var url = postLink(post);
    if (commentConfig.anchorsEnabled === true && comment.anchor) url += '#' + encodeURIComponent(comment.anchor);
    return '<mdui-list-item rounded href="' + html(url) + '"' + (comment.demo ? ' data-demo-comment' : '') + '>' +
      avatar(comment.avatar, Array.from(String(comment.author))[0], comment.author).replace('class="site-avatar"', 'class="comment-avatar" slot="icon"') +
      '<div class="comment-copy"><div class="comment-byline"><strong>' + html(comment.author) + '</strong><time datetime="' + html(date.toISOString()) +
      '" title="' + html(date.toLocaleString('zh-CN')) + '">' + html(time) + '</time></div><p class="comment-excerpt">' +
      html(comment.excerpt) + '</p><p class="comment-post">' + (comment.demo ? '演示 · ' : '') + html(post.title) + '</p></div></mdui-list-item>';
  }
  function sidebarMarkup(context) {
    var prefix = 'side-' + context;
    return '<div class="profile"><div class="profile-brand">' +
      avatar(site.avatar, site.avatarFallback || '林', site.avatarAlt || site.name) +
      '<div><p class="site-name">' + html(site.name) + '</p><p class="site-tagline">' + html(site.tagline) +
      '</p></div></div><p class="site-intro">' + html(site.intro) + '</p></div>' +
      '<div class="side-search"><mdui-text-field variant="outlined" type="search" placeholder="搜索文章…" clearable data-search>' +
      icon('search', 'icon') + '<mdui-button-icon slot="clear-button" tabindex="-1">' + icon('cancel--outlined') +
      '<span class="visually-hidden">清除搜索</span></mdui-button-icon></mdui-text-field></div>' +
      '<mdui-tabs class="sidebar-tabs" value="updates" variant="secondary" full-width aria-label="侧栏内容">' +
      '<mdui-tab value="updates" id="' + prefix + '-updates" role="tab" aria-controls="' + prefix + '-updates-panel">最近更新</mdui-tab>' +
      '<mdui-tab value="friends" id="' + prefix + '-friends" role="tab" aria-controls="' + prefix + '-friends-panel">友情链接</mdui-tab>' +
      '<mdui-tab value="comments" id="' + prefix + '-comments" role="tab" aria-controls="' + prefix + '-comments-panel">最近评论</mdui-tab>' +
      '<mdui-tab-panel slot="panel" value="updates" id="' + prefix + '-updates-panel" role="tabpanel" aria-labelledby="' + prefix + '-updates">' +
      '<div class="side-panel-content"><div class="side-panel-heading"><span>最近的 ' + Math.min(posts.length, 5) + ' 篇记录</span></div>' +
      '<mdui-list>' + posts.slice(0, 5).map(function (post) { return listItem(post, dateLabel(post.date)); }).join('') + '</mdui-list></div></mdui-tab-panel>' +
      '<mdui-tab-panel slot="panel" value="friends" id="' + prefix + '-friends-panel" role="tabpanel" aria-labelledby="' + prefix + '-friends">' +
      '<div class="side-panel-content"><div class="side-panel-heading"><span>' + friends.length + ' 个友邻</span>' +
      '<mdui-button variant="text" data-friends-all' + (friends.length ? '' : ' disabled') + '>查看全部' + icon('arrow_forward', 'end-icon') + '</mdui-button></div>' +
      (friends.length ? '<mdui-list class="friend-list">' + friends.slice(0, 5).map(friendItem).join('') + '</mdui-list>' :
        '<p class="friend-empty">这里，留给有趣的邻居。<small>暂时还没有添加友链</small></p>') + '</div></mdui-tab-panel>' +
      '<mdui-tab-panel slot="panel" value="comments" id="' + prefix + '-comments-panel" role="tabpanel" aria-labelledby="' + prefix + '-comments">' +
      '<div class="side-panel-content"><div class="side-panel-heading"><span>最近的留言</span><span>' + comments.length + ' 条</span></div>' +
      (comments.length ? '<p class="comments-note">' + (comments.some(function (comment) { return comment.demo; }) ? '含明确标注的演示评论。' : '') +
        (commentConfig.anchorsEnabled ? '' : '点击阅读对应文章，评论定位暂未接入。') + '</p><mdui-list class="comment-list">' +
        comments.slice(0, 4).map(commentItem).join('') + '</mdui-list>' :
        '<p class="friend-empty">还没有收到留言。<small>评论系统尚未接入</small></p>') + '</div></mdui-tab-panel></mdui-tabs>';
  }

  document.querySelector('[data-site-appbar]').innerHTML = '<mdui-top-app-bar class="site-appbar" variant="small">' +
    '<mdui-button-icon id="menu-button">' + icon('menu') + '<span class="visually-hidden">打开侧栏</span></mdui-button-icon>' +
    '<mdui-top-app-bar-title><a href="index.html#recent" class="appbar-brand" data-site-name>' +
    avatar(site.avatar, site.avatarFallback || '林', site.avatarAlt || site.name).replace('class="site-avatar"', 'class="brand-avatar" aria-hidden="true"') +
    '<span>' + html(site.name) + '</span></a></mdui-top-app-bar-title>' +
    '<div data-theme-control></div></mdui-top-app-bar>';
  document.querySelector('[data-site-sidebar]').innerHTML = '<div data-sidebar="desktop">' + sidebarMarkup('desktop') + '</div>' +
    '<div class="sidebar-settings"><span>外观</span><div data-theme-control></div></div>';
  document.querySelector('[data-site-footer]').innerHTML = '<p>© 2026 ' + html(site.name) + '<span class="footer-dot">·</span>分享技术，也记录生活。</p>' +
    '<p>本站文章、日期与叙事均为演示内容。</p>';
  document.body.insertAdjacentHTML('beforeend', '<mdui-navigation-drawer id="mobile-drawer" modal close-on-esc close-on-overlay-click role="dialog" aria-modal="true" aria-label="站点侧栏">' +
    '<div class="drawer-toolbar"><span>我的小窝</span><mdui-button-icon id="drawer-close" autofocus>' + icon('close') +
    '<span class="visually-hidden">关闭侧栏</span></mdui-button-icon></div><div class="drawer-content" data-sidebar="mobile">' +
    sidebarMarkup('mobile') + '</div></mdui-navigation-drawer><mdui-snackbar id="site-feedback" role="status" aria-live="polite" auto-close-delay="3000"></mdui-snackbar>');

  document.body.insertAdjacentHTML('beforeend', '<mdui-dialog id="friends-dialog" headline="友情链接" close-on-esc close-on-overlay-click>' +
    '<span slot="description">共 ' + friends.length + ' 个站点，按配置顺序展示。</span><mdui-list class="friend-list">' +
    friends.map(friendItem).join('') + '</mdui-list><mdui-button slot="action" variant="text" id="friends-close">关闭</mdui-button></mdui-dialog>');
  var drawer = document.getElementById('mobile-drawer');
  var menuButton = document.getElementById('menu-button');
  var drawerClose = document.getElementById('drawer-close');
  function setSearch(value) {
    searchValue = String(value);
    document.querySelectorAll('[data-search]').forEach(function (field) { field.value = searchValue; });
  }
  function dispatchSearch(value) {
    setSearch(value);
    document.dispatchEvent(new CustomEvent('nekomi:search', { detail: searchValue }));
  }
  function afterClose(component, callback) {
    // 2.1.5 在 closed 前排入原生焦点恢复任务，下一任务再聚焦搜索结果。
    component.addEventListener('closed', function () { setTimeout(callback, 0); }, { once: true });
    component.open = false;
  }
  function openDrawer(search) {
    drawerClose.autofocus = !search;
    drawer.querySelector('[data-search]').autofocus = Boolean(search);
    drawer.open = true;
  }
  function enter(element, distance) { NekomiMotion.enter(element, distance); }
  function ready() {
    document.getElementById('loading-note').hidden = true;
    document.getElementById('main-content').setAttribute('aria-busy', 'false');
    requestAnimationFrame(function () { enter(document.getElementById('main-content')); });
  }
  function notify(message) {
    var feedback = document.getElementById('site-feedback');
    feedback.textContent = message;
    feedback.open = true;
  }
  document.querySelectorAll('.sidebar-tabs').forEach(function (tabs) {
    NekomiA11y.tabs(tabs);
    tabs.addEventListener('change', function (event) {
      if (event.target !== tabs) return;
      var panel = Array.from(tabs.querySelectorAll('mdui-tab-panel')).find(function (item) { return item.value === tabs.value; });
      if (!panel) return;
      requestAnimationFrame(function () { enter(panel.querySelector('.side-panel-content'), 6); });
    });
  });
  var friendsDialog = document.getElementById('friends-dialog');
  document.querySelectorAll('[data-friends-all]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (drawer.open) afterClose(drawer, function () { friendsDialog.open = true; });
      else friendsDialog.open = true;
    });
  });
  document.getElementById('friends-close').addEventListener('click', function () { friendsDialog.open = false; });
  menuButton.addEventListener('click', function () { openDrawer(false); });
  drawerClose.addEventListener('click', function () { drawer.open = false; });
  NekomiA11y.buttonState(menuButton, { 'aria-controls': 'mobile-drawer', 'aria-expanded': 'false', 'aria-haspopup': 'dialog' });
  ['open', 'close'].forEach(function (type) {
    drawer.addEventListener(type, function (event) {
      if (event.target === drawer) NekomiA11y.buttonState(menuButton, { 'aria-expanded': String(type === 'open') });
    });
  });
  mobile.addEventListener('change', function () { if (!mobile.matches) drawer.open = false; });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) enter(document.getElementById('main-content'));
  });
  document.querySelectorAll('[data-search]').forEach(function (field) {
    field.addEventListener('input', function () { dispatchSearch(field.value); });
    field.addEventListener('keydown', function (event) {
      if (event.isComposing) return;
      if (event.key === 'Escape' && !drawer.open && searchValue) { event.preventDefault(); dispatchSearch(''); }
      if (event.key === 'Enter' && searchValue.trim()) {
        event.preventDefault();
        if (isHome) document.dispatchEvent(new Event('nekomi:search-submit'));
        else location.href = filterLink(searchValue);
      }
    });
  });
  document.addEventListener('keydown', function (event) {
    var active = document.activeElement;
    if (event.key !== '/' || event.isComposing || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey ||
        active.isContentEditable || active.matches('input, textarea, select, mdui-text-field')) return;
    event.preventDefault();
    if (mobile.matches && !drawer.open) openDrawer(true);
    else document.querySelector('[data-sidebar="' + (mobile.matches ? 'mobile' : 'desktop') + '"] [data-search]').focus();
  });
  document.addEventListener('error', function (event) {
    var image = event.target;
    if (!image.matches) return;
    if (image.matches('[data-cover]')) image.closest('.post-cover').remove();
    else if (image.matches('[data-avatar]')) image.remove();
    else if (image.matches('[data-hero]')) image.closest('figure').remove();
    else if (image.matches('.prose img')) {
      var fallback = document.createElement('p');
      fallback.className = 'image-fallback';
      fallback.setAttribute('role', 'note');
      fallback.textContent = '图片暂时无法显示' + (image.alt ? '：' + image.alt : '');
      image.replaceWith(fallback);
    }
  }, true);
  window.NekomiSite = {
    html: html, safeUrl: safeUrl, dateLabel: dateLabel, icon: icon, postLink: postLink, filterLink: filterLink,
    posts: posts, listItem: listItem, chip: chip, drawer: drawer, setSearch: setSearch,
    afterClose: afterClose, enter: enter, ready: ready, notify: notify
  };
}());
