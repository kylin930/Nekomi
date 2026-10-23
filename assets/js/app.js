/* 首页索引：文章使用真实链接，搜索与 Tabs 状态可从 URL 恢复。 */
(function () {
  'use strict';
  if (!window.NekomiSite) {
    document.getElementById('loading-note').textContent = '页面暂时未能加载，请检查网络后刷新。';
    return;
  }
  var Site = NekomiSite;
  var posts = Site.posts;
  var html = Site.html, safeUrl = Site.safeUrl, dateLabel = Site.dateLabel, icon = Site.icon;
  var postLink = Site.postLink, listItem = Site.listItem, chip = Site.chip;
  var tabIds = ['recent', 'categories', 'tags', 'archive'];
  var tabs = document.getElementById('content-tabs');
  var feedTitle = document.getElementById('feed-title');
  var query = '';
  var booting = true;
  function highlight(text) {
    var index = text.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
    if (!query.trim() || index < 0) return html(text);
    return html(text.slice(0, index)) + '<mark>' + html(text.slice(index, index + query.trim().length)) + '</mark>' +
      html(text.slice(index + query.trim().length));
  }
  function article(post) {
    var tone = ({ '设计': 'blossom', '日常': 'sky', '工程': 'secondary' })[post.category] || 'primary';
    var latest = post.id === posts[0].id;
    var cover = safeUrl(post.cover);
    return '<mdui-card variant="' + (latest ? 'filled' : 'outlined') + '" class="post-card' + (latest ? ' post-latest' : '') + '" data-tone="' + tone + '"><article class="post-content">' +
      '<div class="post-main"><div class="post-copy"><div class="post-meta"><span class="post-category">' + html(post.category) + '</span>' +
      '<time datetime="' + html(post.date) + '">' + dateLabel(post.date) + '</time>' +
      (latest ? '<span class="post-new">最新一篇</span>' : '') + '</div>' +
      '<h2 class="post-title"><a href="' + postLink(post) + '" data-post="' + html(post.id) + '">' + highlight(post.title) + '</a></h2>' +
      '<p class="post-excerpt">' + highlight(post.excerpt) + '</p></div>' +
      (cover ? '<a class="post-cover" href="' + postLink(post) + '" data-post="' + html(post.id) +
        '" aria-label="阅读文章：' + html(post.title) + '">' +
        '<img src="' + html(cover) + '" alt="" loading="lazy" decoding="async" data-cover></a>' : '') +
      '</div><div class="post-footer"><div class="post-tags">' + post.tags.map(function (tag) { return chip(tag); }).join('') + '</div>' +
      '<mdui-button variant="text" href="' + postLink(post) + '" data-post="' + html(post.id) + '">阅读全文' + icon('arrow_forward', 'end-icon') +
      '</mdui-button></div></article></mdui-card>';
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
      : posts.length + ' 篇演示记录 · 按时间收录';
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
    var url = new URL(location.href);
    url.hash = tabs.value;
    if (query.trim() && tabs.value === 'recent') url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (push !== false && url.href !== location.href) history.pushState(null, '', url);
  }
  function setQuery(value, focus, fromLocation) {
    var wasSearching = Boolean(query.trim());
    var firstSearch = !query.trim() && String(value).trim();
    query = String(value);
    Site.setSearch(query);
    if (query.trim() && tabs.value !== 'recent') navigate('recent', !fromLocation);
    if (!fromLocation) {
      var url = new URL(location.href);
      if (query.trim()) url.searchParams.set('q', query); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }
    renderFeed();
    // 连续输入不反复重置透明度；只在进入 / 清空结果和点击筛选时过渡。
    if (!booting && (firstSearch || focus || wasSearching && !query.trim())) Site.enter(document.getElementById('post-list'), 6);
    if (focus) requestAnimationFrame(function () { feedTitle.focus(); });
    else if (firstSearch && !Site.drawer.open) requestAnimationFrame(function () { feedTitle.scrollIntoView({ block: 'start' }); });
  }
  function readLocation() {
    var raw = location.hash.slice(1);
    if (raw.startsWith('preview/')) {
      try {
        var legacy = posts.find(function (post) { return post.id === decodeURIComponent(raw.slice(8)); });
        if (legacy) { location.replace(postLink(legacy)); return; }
      } catch (_) { /* 无效旧链接回到首页。 */ }
    }
    var tab = tabIds.includes(raw) ? raw : 'recent';
    navigate(tab, false);
    setQuery(tab === 'recent' ? new URLSearchParams(location.search).get('q') || '' : '', false, true);
    if (!tabIds.includes(raw)) {
      var url = new URL(location.href); url.hash = 'recent'; history.replaceState(null, '', url);
    }
  }
  document.title = NekomiData.site.name + ' · ' + NekomiData.site.tagline;
  feedTitle.tabIndex = -1;
  renderCollections();
  NekomiA11y.tabs(tabs);
  tabs.addEventListener('change', function (event) {
    if (event.target !== tabs) return;
    if (tabs.value !== 'recent' && query) { query = ''; Site.setSearch(''); renderFeed(); }
    navigate(tabs.value);
    if (!booting) requestAnimationFrame(function () { Site.enter(document.getElementById('panel-' + tabs.value)); });
  });
  tabs.addEventListener('click', function (event) {
    var tab = event.target.closest('mdui-tab');
    if (tab && tab.value === 'recent' && query) setQuery('', true);
  });
  window.addEventListener('popstate', readLocation);
  window.addEventListener('hashchange', readLocation);
  document.addEventListener('nekomi:search', function (event) { setQuery(event.detail); });
  document.addEventListener('nekomi:search-submit', function () {
    var focusResult = function () { (document.querySelector('#post-list .post-title a') || feedTitle).focus(); };
    if (Site.drawer.open) Site.afterClose(Site.drawer, focusResult); else focusResult();
  });
  document.getElementById('search-chip').addEventListener('delete', function () { setQuery('', true); });
  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-query], [data-clear-search]');
    if (!target || event.metaKey || event.ctrlKey || event.altKey || event.button) return;
    event.preventDefault();
    setQuery(target.hasAttribute('data-query') ? target.dataset.query : '', true);
  });
  readLocation();
  Site.ready();
  requestAnimationFrame(function () { booting = false; });
}());
