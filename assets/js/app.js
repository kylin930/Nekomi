/* 静态数据 → 原生 MDUI 组件。业务状态只有搜索词；Tabs 与模态状态由组件持有。 */
(function () {
  'use strict';
  var status = document.getElementById('loading-note');
  if (!window.mdui || !window.NekomiData) {
    status.textContent = '页面暂时未能加载，请检查网络后刷新。';
    return;
  }
  var data = window.NekomiData;
  var site = data.site;
  var posts = data.posts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  var byId = new Map(posts.map(function (post) { return [post.id, post]; }));
  var tabIds = ['recent', 'categories', 'tags', 'archive'];
  var tabs = document.getElementById('content-tabs');
  var drawer = document.getElementById('mobile-drawer');
  var menuButton = document.getElementById('menu-button');
  var drawerClose = document.getElementById('drawer-close');
  var dialog = document.getElementById('post-dialog');
  var feedTitle = document.getElementById('feed-title');
  var mobile = matchMedia('(max-width: 860px)');
  var query = '';

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
  function highlight(text) {
    var index = text.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
    if (!query.trim() || index < 0) return html(text);
    return html(text.slice(0, index)) + '<mark>' + html(text.slice(index, index + query.trim().length)) + '</mark>' +
      html(text.slice(index + query.trim().length));
  }
  function icon(name, slot) {
    return '<mdui-icon name="' + name + '" aria-hidden="true"' + (slot ? ' slot="' + slot + '"' : '') + '></mdui-icon>';
  }
  function avatar(src, fallback, label) {
    return '<mdui-avatar class="site-avatar" role="img" aria-label="' + html(label) + '">' + html(fallback) +
      (safeUrl(src) ? '<img src="' + html(safeUrl(src)) + '" alt="" data-avatar>' : '') + '</mdui-avatar>';
  }
  function postLink(post) { return '#preview/' + encodeURIComponent(post.id); }
  function listItem(post, description) {
    return '<mdui-list-item rounded href="' + postLink(post) + '" data-post="' + html(post.id) +
      '" headline="' + html(post.title) + '" headline-line="2" description="' + html(description) +
      '" aria-haspopup="dialog"></mdui-list-item>';
  }
  function sidebarMarkup() {
    var friends = data.friends.filter(function (friend) { return safeUrl(friend.url); }).slice(0, 5);
    return '<div class="profile"><div class="profile-brand">' +
      avatar(site.avatar, site.avatarFallback || '林', site.avatarAlt || site.name) +
      '<div><p class="site-name">' + html(site.name) + '</p><p class="site-tagline">' + html(site.tagline) +
      '</p></div></div><p class="site-intro">' + html(site.intro) + '</p></div>' +
      '<div class="side-search"><mdui-text-field variant="outlined" type="search" placeholder="搜索文章…" clearable data-search>' +
        icon('search', 'icon') + '<mdui-button-icon slot="clear-button" tabindex="-1">' + icon('cancel--outlined') +
        '<span class="visually-hidden">清除搜索</span></mdui-button-icon></mdui-text-field></div>' +
      '<section class="side-section"><div class="side-section-heading"><h2>最近更新</h2><span>最新 ' + Math.min(posts.length, 5) + ' 篇</span></div>' +
      '<mdui-list>' + posts.slice(0, 5).map(function (post) { return listItem(post, dateLabel(post.date)); }).join('') + '</mdui-list></section>' +
      '<section class="side-section"><div class="side-section-heading"><h2>友情链接</h2>' + icon('link') + '</div>' +
      (friends.length ? '<mdui-list>' + friends.map(function (friend) {
        return '<mdui-list-item rounded href="' + html(safeUrl(friend.url)) + '" target="_blank" rel="noopener noreferrer" headline="' +
          html(friend.name) + '" description="' + html(friend.description || '') + '">' +
          avatar(friend.avatar, friend.name.slice(0, 1), friend.name).replace('class="site-avatar"', 'class="friend-avatar" slot="icon"') + '</mdui-list-item>';
      }).join('') + '</mdui-list>' : '<p class="friend-empty">这里，留给有趣的邻居。<small>暂时还没有添加友链</small></p>') + '</section>';
  }
  function chip(tag, count) {
    return '<mdui-chip variant="suggestion" data-query="' + html(tag) + '">' + html(tag) +
      (count ? '<span class="tag-count">' + count + '</span>' : '') + '</mdui-chip>';
  }
  function article(post) {
    var cover = safeUrl(post.cover);
    return '<mdui-card variant="outlined" class="post-card"><article>' +
      (cover ? '<img class="post-cover" src="' + html(cover) + '" alt="" loading="lazy" data-cover>' : '') +
      '<div class="post-content"><div class="post-meta"><time datetime="' + html(post.date) + '">' + dateLabel(post.date) +
      '</time><span aria-hidden="true">/</span><span class="post-category">' + html(post.category) + '</span></div>' +
      '<h2 class="post-title"><a href="' + postLink(post) + '" data-post="' + html(post.id) + '" aria-haspopup="dialog">' + highlight(post.title) + '</a></h2>' +
      '<p class="post-excerpt">' + highlight(post.excerpt) + '</p>' +
      '<div class="post-footer"><div class="post-tags">' + post.tags.map(function (tag) { return chip(tag); }).join('') + '</div>' +
      '<mdui-button variant="text" data-post="' + html(post.id) + '" aria-haspopup="dialog">预览文章' + icon('arrow_forward', 'end-icon') +
      '</mdui-button></div></div></article></mdui-card>';
  }
  function renderFeed() {
    var needle = query.trim().toLocaleLowerCase();
    var found = posts.filter(function (post) {
      return [post.title, post.excerpt, post.category].concat(post.tags).join(' ').toLocaleLowerCase().includes(needle);
    });
    document.getElementById('post-list').innerHTML = found.map(article).join('');
    feedTitle.textContent = needle ? '搜索结果' : '最近发布';
    document.getElementById('feed-summary').textContent = needle
      ? '“' + query.trim() + '” · 找到 ' + found.length + ' 篇文章'
      : '共 ' + posts.length + ' 篇记录，按时间慢慢展开。';
    document.getElementById('search-toolbar').hidden = !needle;
    document.getElementById('search-chip').textContent = query.trim();
    document.getElementById('search-empty').hidden = found.length > 0;
  }
  function groupBy(key) {
    var groups = new Map();
    posts.forEach(function (post) {
      var name = key(post);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(post);
    });
    return groups;
  }
  function renderCollections() {
    var categories = groupBy(function (post) { return post.category; });
    document.getElementById('categories-summary').textContent = categories.size + ' 个分类，把零散的想法收进不同的抽屉。';
    document.getElementById('categories-list').innerHTML = Array.from(categories).map(function (entry) {
      return '<mdui-card variant="outlined" class="collection-card"><section><div class="collection-heading"><h2>' + html(entry[0]) + '</h2>' +
        '<mdui-button variant="text" data-query="' + html(entry[0]) + '">查看 ' + entry[1].length + ' 篇</mdui-button></div>' +
        '<mdui-list>' + entry[1].map(function (post) { return listItem(post, dateLabel(post.date)); }).join('') + '</mdui-list></section></mdui-card>';
    }).join('');
    var tags = new Map();
    posts.forEach(function (post) { post.tags.forEach(function (tag) { tags.set(tag, (tags.get(tag) || 0) + 1); }); });
    document.getElementById('tags-summary').textContent = tags.size + ' 个关键词。选择一个，看看相关的记录。';
    document.getElementById('tags-list').innerHTML = Array.from(tags).sort(function (a, b) { return b[1] - a[1]; })
      .map(function (entry) { return chip(entry[0], entry[1]); }).join('');
    var months = groupBy(function (post) { return post.date.slice(0, 7); });
    document.getElementById('archive-summary').textContent = posts.length + ' 篇文章，' + months.size + ' 个月份。每一篇，都是当时的一个切片。';
    document.getElementById('archive-list').innerHTML = Array.from(months).map(function (entry) {
      var parts = entry[0].split('-');
      return '<mdui-card variant="outlined" class="collection-card"><section><div class="collection-heading"><h2>' + parts[0] + ' 年 ' + Number(parts[1]) + ' 月</h2>' +
        '<span class="collection-count">' + entry[1].length + ' 篇</span></div><mdui-list>' +
        entry[1].map(function (post) { return listItem(post, post.date.slice(5).replace('-', ' / ') + ' · ' + post.category); }).join('') + '</mdui-list></section></mdui-card>';
    }).join('');
  }
  function navigate(tab, push) {
    tabs.value = tabIds.includes(tab) ? tab : 'recent';
    if (push !== false && location.hash !== '#' + tabs.value) history.pushState(null, '', '#' + tabs.value);
  }
  function setQuery(value, focus) {
    var firstSearch = !query.trim() && String(value).trim();
    query = String(value);
    document.querySelectorAll('[data-search]').forEach(function (field) { field.value = query; });
    if (query.trim()) navigate('recent');
    renderFeed();
    if (focus) requestAnimationFrame(function () { feedTitle.focus(); });
    else if (firstSearch && !drawer.open) {
      requestAnimationFrame(function () { feedTitle.scrollIntoView({ block: 'start' }); });
    }
  }
  function afterClose(component, callback) {
    component.addEventListener('closed', function () {
      // MDUI 2.1.5 在发出 closed 前排入焦点恢复任务。
      setTimeout(callback, 0);
    }, { once: true });
    component.open = false;
  }
  function showPost(post) {
    document.getElementById('preview-title').textContent = post.title;
    document.getElementById('preview-meta').textContent = dateLabel(post.date) + ' · ' + post.category;
    document.getElementById('preview-excerpt').textContent = post.excerpt;
    document.getElementById('preview-tags').innerHTML = post.tags.map(function (tag) { return chip(tag); }).join('');
    dialog.open = true;
  }
  function openPost(id) {
    if (!byId.has(id)) return;
    if (drawer.open) {
      afterClose(drawer, function () { menuButton.focus({ preventScroll: true }); showPost(byId.get(id)); });
    } else showPost(byId.get(id));
  }
  function openDrawer(search) {
    drawerClose.autofocus = !search;
    drawer.querySelector('[data-search]').autofocus = Boolean(search);
    drawer.open = true;
  }
  function readLocation() {
    var raw = location.hash.slice(1);
    if (tabIds.includes(raw)) {
      setQuery('');
      navigate(raw, false);
    } else {
      navigate('recent', false);
      if (raw.startsWith('preview/')) {
        try { openPost(decodeURIComponent(raw.slice(8))); } catch (_) { /* 无效片段不阻止浏览首页。 */ }
      } else history.replaceState(null, '', '#recent');
    }
  }

  document.querySelectorAll('[data-site-name]').forEach(function (element) { element.textContent = site.name; });
  document.title = site.name + ' · ' + site.tagline;
  document.querySelectorAll('[data-sidebar]').forEach(function (element) { element.innerHTML = sidebarMarkup(); });
  feedTitle.tabIndex = -1;
  renderFeed();
  renderCollections();
  NekomiA11y.tabs(tabs);
  NekomiA11y.buttonState(menuButton, { 'aria-controls': 'mobile-drawer', 'aria-expanded': 'false', 'aria-haspopup': 'dialog' });
  tabs.addEventListener('change', function (event) {
    if (event.target !== tabs) return;
    if (tabs.value !== 'recent' && query) setQuery('');
    navigate(tabs.value);
  });
  tabs.addEventListener('click', function (event) {
    var tab = event.target.closest('mdui-tab');
    if (tab && tab.value === 'recent' && query) setQuery('', true);
  });
  window.addEventListener('popstate', readLocation);
  window.addEventListener('hashchange', readLocation);
  menuButton.addEventListener('click', function () { openDrawer(false); });
  drawerClose.addEventListener('click', function () { drawer.open = false; });
  document.getElementById('dialog-close').addEventListener('click', function () { dialog.open = false; });
  ['open', 'close'].forEach(function (type) {
    drawer.addEventListener(type, function (event) {
      if (event.target === drawer) NekomiA11y.buttonState(menuButton, { 'aria-expanded': String(type === 'open') });
    });
  });
  mobile.addEventListener('change', function () { if (!mobile.matches) drawer.open = false; });
  document.querySelectorAll('[data-search]').forEach(function (field) {
    field.addEventListener('input', function () { setQuery(field.value); });
    field.addEventListener('keydown', function (event) {
      if (event.isComposing) return;
      if (event.key === 'Escape' && !drawer.open && query) { event.preventDefault(); setQuery(''); }
      if (event.key === 'Enter' && query.trim()) {
        event.preventDefault();
        var focusResult = function () { (document.querySelector('#post-list .post-title a') || feedTitle).focus(); };
        if (drawer.open) afterClose(drawer, focusResult); else focusResult();
      }
    });
  });
  document.getElementById('search-chip').addEventListener('delete', function () { setQuery('', true); });
  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-post], [data-query], [data-clear-search]');
    if (!target || event.metaKey || event.ctrlKey || event.altKey || event.button) return;
    event.preventDefault();
    if (target.hasAttribute('data-post')) openPost(target.dataset.post);
    else if (target.hasAttribute('data-query')) {
      var filter = function () { setQuery(target.dataset.query, true); };
      if (dialog.open) afterClose(dialog, filter); else filter();
    } else setQuery('', true);
  });
  document.addEventListener('keydown', function (event) {
    var active = document.activeElement;
    if (event.key !== '/' || event.isComposing || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey ||
        dialog.open || document.querySelector('mdui-dropdown[open]') || active.isContentEditable ||
        active.matches('input, textarea, select, mdui-text-field')) return;
    event.preventDefault();
    if (mobile.matches && !drawer.open) openDrawer(true);
    else document.querySelector('[data-sidebar="' + (mobile.matches ? 'mobile' : 'desktop') + '"] [data-search]').focus();
  });
  document.addEventListener('error', function (event) {
    if (event.target.matches && event.target.matches('[data-cover], [data-avatar]')) event.target.remove();
  }, true);
  status.hidden = true;
  readLocation();
}());
