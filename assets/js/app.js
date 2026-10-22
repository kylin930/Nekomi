/**
 * P0 首页：数据渲染与交互
 *
 * 一份文章数据同时驱动：主文章列表、侧栏最近更新、搜索结果、分类、标签与归档。
 * 不依赖任何博客框架，也不连接远程搜索服务。
 */
(function () {
  'use strict';

  var DATA = window.NekomiData;
  if (!DATA || !Array.isArray(DATA.posts)) {
    return;
  }

  var TAB_IDS = ['recent', 'categories', 'tags', 'archive'];
  var MOBILE_QUERY = '(max-width: 900px)';
  var THEME_QUERY = '(prefers-reduced-motion: reduce)';

  var site = DATA.site || {};
  var posts = DATA.posts
    .slice()
    .map(function (post) {
      return {
        id: String(post.id || ''),
        title: String(post.title || '未命名文章'),
        excerpt: String(post.excerpt || ''),
        date: String(post.date || ''),
        category: String(post.category || '未分类'),
        tags: Array.isArray(post.tags) ? post.tags.map(String) : [],
        cover: String(post.cover || '')
      };
    })
    .filter(function (post) {
      return post.id !== '';
    })
    .sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

  var postById = new Map(posts.map(function (post) { return [post.id, post]; }));
  var state = {
    tab: 'recent',
    query: '',
    focusSearchOnOpen: false
  };

  var el = {
    tabs: document.getElementById('content-tabs'),
    tabsSticky: document.getElementById('tabs-sticky'),
    sentinel: document.getElementById('tabs-sentinel'),
    panels: Array.prototype.slice.call(document.querySelectorAll('.view-panel[data-tab]')),
    postList: document.getElementById('post-list'),
    recentMeta: document.getElementById('recent-meta'),
    recentMetaWrap: document.getElementById('recent-view-meta'),
    searchView: document.getElementById('search-view'),
    searchResults: document.getElementById('search-results'),
    searchSummary: document.getElementById('search-summary'),
    searchEmpty: document.getElementById('search-empty'),
    searchTitle: document.getElementById('search-title'),
    categoriesList: document.getElementById('categories-list'),
    categoriesMeta: document.getElementById('categories-meta'),
    tagsList: document.getElementById('tags-list'),
    tagsMeta: document.getElementById('tags-meta'),
    archiveList: document.getElementById('archive-list'),
    archiveMeta: document.getElementById('archive-meta'),
    sidebarDesktop: document.getElementById('sidebar-desktop'),
    sidebarDrawer: document.getElementById('sidebar-drawer'),
    drawer: document.getElementById('mobile-drawer'),
    menuButton: document.getElementById('menu-button'),
    drawerClose: document.getElementById('drawer-close'),
    dialog: document.getElementById('post-dialog'),
    dialogMeta: document.getElementById('dialog-meta'),
    dialogExcerpt: document.getElementById('dialog-excerpt'),
    dialogTags: document.getElementById('dialog-tags'),
    dialogClose: document.getElementById('dialog-close')
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attr(value) {
    return escapeHtml(value);
  }

  function safeAssetUrl(value) {
    var url = String(value || '').trim();
    if (!url) {
      return '';
    }
    if (/^(https?:\/\/|\/|\.\/|assets\/)/i.test(url)) {
      return url;
    }
    return '';
  }

  function safeSiteUrl(value) {
    var url = String(value || '').trim();
    return /^https?:\/\//i.test(url) ? url : '';
  }

  function parseDate(value) {
    var parts = String(value).split('-').map(Number);
    return {
      year: parts[0] || 0,
      month: parts[1] || 0,
      day: parts[2] || 0
    };
  }

  function formatDate(value) {
    var date = parseDate(value);
    return date.year + ' 年 ' + date.month + ' 月 ' + date.day + ' 日';
  }

  function formatShortDate(value) {
    var date = parseDate(value);
    return date.month + ' 月 ' + date.day + ' 日';
  }

  function formatMonthDay(value) {
    var date = parseDate(value);
    return String(date.month).padStart(2, '0') + '-' + String(date.day).padStart(2, '0');
  }

  function highlight(text, query) {
    var source = String(text);
    var needle = String(query || '').trim();
    if (!needle) {
      return escapeHtml(source);
    }
    var index = source.toLowerCase().indexOf(needle.toLowerCase());
    if (index === -1) {
      return escapeHtml(source);
    }
    return escapeHtml(source.slice(0, index)) +
      '<mark>' + escapeHtml(source.slice(index, index + needle.length)) + '</mark>' +
      escapeHtml(source.slice(index + needle.length));
  }

  function isSearching() {
    return state.query.trim().length > 0;
  }

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia(THEME_QUERY).matches;
  }

  function getStickyTop() {
    if (!isMobile()) {
      return 0;
    }
    var bar = document.querySelector('.mobile-bar');
    return bar ? bar.getBoundingClientRect().height : 56;
  }

  function isUpgraded(tagName) {
    return !!(window.customElements && window.customElements.get(tagName));
  }

  function setElementOpen(element, open) {
    if (!element) {
      return;
    }
    if (isUpgraded(element.localName)) {
      element.open = open;
    } else {
      element.toggleAttribute('open', open);
    }
  }

  function setTabsValue(value) {
    if (!el.tabs) {
      return;
    }
    if (isUpgraded('mdui-tabs')) {
      if (el.tabs.value !== value) {
        el.tabs.value = value;
      }
    } else {
      el.tabs.setAttribute('value', value);
    }
  }

  function getTabs() {
    return el.tabs ? Array.prototype.slice.call(el.tabs.querySelectorAll('mdui-tab')) : [];
  }

  function tabValue(tab) {
    return tab.value || tab.getAttribute('value') || '';
  }

  function avatarMarkup() {
    var src = safeAssetUrl(site.avatar);
    var fallback = site.avatarFallback || '林';
    var label = site.avatarAlt || (site.name || '站点') + '头像';

    if (src) {
      return '<div class="avatar" role="img" aria-label="' + attr(label) + '" data-fallback="' + attr(fallback) + '">' +
        '<img src="' + attr(src) + '" alt="" data-avatar>' +
        '</div>';
    }

    return '<div class="avatar is-fallback" role="img" aria-label="' + attr(label) + '（文字头像）" data-fallback="' + attr(fallback) + '"></div>';
  }

  function recentMarkup() {
    var recent = posts.slice(0, 5);
    if (!recent.length) {
      return '<p class="side-empty">还没有文章。</p>';
    }

    return '<ul class="recent-list">' + recent.map(function (post, index) {
      var isCurrent = index === 0;
      return '<li>' +
        '<button type="button" class="recent-item' + (isCurrent ? ' is-current' : '') + '"' +
        ' data-post-id="' + attr(post.id) + '"' +
        ' aria-label="' + attr((isCurrent ? '最新文章：' : '') + post.title + '，' + formatDate(post.date)) + '"' +
        (isCurrent ? ' aria-current="true"' : '') + '>' +
        '<span class="recent-item__title">' + escapeHtml(post.title) + '</span>' +
        '<span class="recent-item__date">' + escapeHtml(formatShortDate(post.date)) + '</span>' +
        '</button>' +
        '</li>';
    }).join('') + '</ul>';
  }

  function friendsMarkup() {
    var friends = (Array.isArray(DATA.friends) ? DATA.friends : []).slice(0, 5);
    var list = '';

    if (friends.length) {
      list = '<ul class="friend-list">' + friends.map(function (friend) {
        var name = String(friend.name || '未命名站点');
        var url = safeSiteUrl(friend.url);
        var description = friend.description ? String(friend.description) : '';
        var avatar = safeAssetUrl(friend.avatar);
        var media = avatar
          ? '<img src="' + attr(avatar) + '" alt="" loading="lazy" decoding="async">'
          : '<mdui-icon name="public--outlined" aria-hidden="true"></mdui-icon>';
        var body = '<span class="friend-avatar" aria-hidden="true">' + media + '</span>' +
          '<span class="friend-copy"><span class="friend-name">' + escapeHtml(name) + '</span>' +
          (description ? '<span class="friend-desc">' + escapeHtml(description) + '</span>' : '') +
          '</span>';

        return '<li>' + (url
          ? '<a class="friend-link" href="' + attr(url) + '" target="_blank" rel="noopener noreferrer">' + body + '</a>'
          : '<span class="friend-link is-static">' + body + '</span>') + '</li>';
      }).join('') + '</ul>';
    } else {
      list = '<div class="friend-empty">' +
        '<p class="friend-empty__title">还没有添加友链</p>' +
        '<p class="friend-empty__desc">站长提供友链后会显示在这里。</p>' +
        '</div>';
    }

    return '<section class="side-section" aria-label="友情链接">' +
      '<div class="side-heading"><h2>友情链接</h2><span class="side-count">' + friends.length + '/5</span></div>' +
      list +
      '<button type="button" class="more-link" disabled title="完整友链页面将在后续版本实现">查看全部<span class="more-link__arrow" aria-hidden="true">→</span></button>' +
      '</section>';
  }

  function sidebarMarkup() {
    return '' +
      '<div class="profile">' +
        avatarMarkup() +
        '<div class="profile-copy">' +
          '<p class="site-name">' + escapeHtml(site.name || '小林的小窝') + '</p>' +
          '<p class="site-tagline">' + escapeHtml(site.tagline || '分享技术、日常') + '</p>' +
          (site.intro ? '<p class="site-intro">' + escapeHtml(site.intro) + '</p>' : '') +
        '</div>' +
      '</div>' +
      '<div class="side-rule" role="presentation"></div>' +
      '<div class="side-search">' +
        '<mdui-text-field variant="outlined" type="search" clearable ' +
          'placeholder="搜索标题、摘要或标签" aria-label="搜索演示文章" data-role="search">' +
          '<mdui-icon slot="icon" name="search" aria-hidden="true"></mdui-icon>' +
          '<mdui-button-icon slot="clear-button" tabindex="-1" title="清除搜索">' +
            '<mdui-icon name="cancel--outlined" aria-hidden="true"></mdui-icon>' +
            '<span class="visually-hidden">清除搜索</span>' +
          '</mdui-button-icon>' +
        '</mdui-text-field>' +
      '</div>' +
      '<div class="side-rule" role="presentation"></div>' +
      '<section class="side-section" aria-label="最近更新">' +
        '<div class="side-heading"><h2>最近更新</h2><span class="side-count">' + Math.min(posts.length, 5) + ' 篇</span></div>' +
        recentMarkup() +
      '</section>' +
      '<div class="side-rule" role="presentation"></div>' +
      friendsMarkup();
  }

  function tagButtonsMarkup(post) {
    return post.tags.map(function (tag) {
      return '<button type="button" class="tag-chip" data-tag="' + attr(tag) + '" title="在最近发布中筛选“' + attr(tag) + '”">#' + escapeHtml(tag) + '</button>';
    }).join('');
  }

  function postCardMarkup(post, options) {
    var opts = options || {};
    var cover = safeAssetUrl(post.cover);
    var title = opts.query ? highlight(post.title, opts.query) : escapeHtml(post.title);
    var excerpt = opts.query ? highlight(post.excerpt, opts.query) : escapeHtml(post.excerpt);

    return '<article class="post-card' + (cover ? ' post-card--with-cover' : '') + '">' +
      '<div class="post-card__main">' +
        '<div class="post-meta">' +
          '<time datetime="' + attr(post.date) + '">' + escapeHtml(formatDate(post.date)) + '</time>' +
          '<span class="meta-sep" aria-hidden="true">·</span>' +
          '<span class="post-category">' + escapeHtml(post.category) + '</span>' +
        '</div>' +
        '<h2 class="post-title">' +
          '<button type="button" class="post-title__button" data-post-id="' + attr(post.id) + '" aria-haspopup="dialog">' + title + '</button>' +
        '</h2>' +
        '<p class="post-excerpt">' + excerpt + '</p>' +
        (post.tags.length
          ? '<div class="post-foot"><span class="visually-hidden">标签：</span>' + tagButtonsMarkup(post) + '</div>'
          : '') +
      '</div>' +
      (cover
        ? '<div class="post-cover"><img src="' + attr(cover) + '" alt="" loading="lazy" decoding="async" data-cover></div>'
        : '') +
      '</article>';
  }

  function renderArticleList() {
    el.recentMeta.textContent = posts.length
      ? '共 ' + posts.length + ' 篇演示文章 · 按日期排序'
      : '暂无演示文章';

    if (!posts.length) {
      el.postList.innerHTML = '<div class="empty-state"><mdui-icon name="article--outlined" aria-hidden="true"></mdui-icon><h2>还没有文章</h2><p>在演示数据中添加文章后会显示在这里。</p></div>';
      return;
    }

    el.postList.innerHTML = posts.map(function (post) {
      return postCardMarkup(post);
    }).join('');
  }

  function groupBy(keyGetter) {
    var map = new Map();
    posts.forEach(function (post) {
      var key = keyGetter(post);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(post);
    });
    return map;
  }

  function renderCategories() {
    var grouped = groupBy(function (post) { return post.category; });
    var rows = Array.from(grouped.entries()).sort(function (a, b) {
      return b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-CN');
    });

    el.categoriesMeta.textContent = '共 ' + rows.length + ' 个分类 · ' + posts.length + ' 篇演示文章';
    el.categoriesList.innerHTML = rows.map(function (entry) {
      var name = entry[0];
      var list = entry[1];
      var shown = list.slice(0, 3);

      return '<section class="summary-row">' +
        '<div class="summary-row__head"><h2 class="summary-title">' + escapeHtml(name) + '</h2>' +
        '<span class="summary-count">' + list.length + ' 篇</span></div>' +
        '<ul class="summary-posts">' + shown.map(function (post) {
          return '<li><button type="button" class="summary-post" data-post-id="' + attr(post.id) + '">' +
            '<span class="summary-post__title">' + escapeHtml(post.title) + '</span>' +
            '<time datetime="' + attr(post.date) + '">' + escapeHtml(formatMonthDay(post.date)) + '</time>' +
            '</button></li>';
        }).join('') + '</ul>' +
        (list.length > shown.length
          ? '<p class="summary-note">另有 ' + (list.length - shown.length) + ' 篇同分类文章</p>'
          : '') +
        '</section>';
    }).join('');
  }

  function renderTags() {
    var counts = new Map();
    posts.forEach(function (post) {
      post.tags.forEach(function (tag) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });

    var entries = Array.from(counts.entries()).map(function (entry) {
      return { name: entry[0], count: entry[1] };
    }).sort(function (a, b) {
      return b.count - a.count || a.name.localeCompare(b.name, 'zh-CN');
    });

    el.tagsMeta.textContent = '共 ' + entries.length + ' 个标签 · ' + posts.length + ' 篇演示文章';
    el.tagsList.innerHTML = '<div class="tag-cloud">' + entries.map(function (entry) {
      return '<button type="button" class="tag-pill" data-tag="' + attr(entry.name) + '" title="在最近发布中筛选“' + attr(entry.name) + '”">' +
        '<span class="tag-pill__name">#' + escapeHtml(entry.name) + '</span>' +
        '<span class="tag-pill__count">' + entry.count + '</span>' +
        '</button>';
    }).join('') + '</div>';
  }

  function renderArchive() {
    var grouped = new Map();
    posts.forEach(function (post) {
      var year = parseDate(post.date).year || '未知';
      if (!grouped.has(year)) {
        grouped.set(year, []);
      }
      grouped.get(year).push(post);
    });

    var years = Array.from(grouped.keys()).sort(function (a, b) {
      return String(b).localeCompare(String(a));
    });

    el.archiveMeta.textContent = '共 ' + posts.length + ' 篇演示文章 · ' + years.length + ' 个年份';
    el.archiveList.innerHTML = years.map(function (year) {
      var list = grouped.get(year);
      return '<section class="summary-row archive-row">' +
        '<div class="summary-row__head"><h2 class="summary-title">' + escapeHtml(year) + '</h2>' +
        '<span class="summary-count">' + list.length + ' 篇</span></div>' +
        '<ul class="archive-list">' + list.map(function (post) {
          return '<li><button type="button" class="archive-post" data-post-id="' + attr(post.id) + '">' +
            '<time datetime="' + attr(post.date) + '">' + escapeHtml(formatMonthDay(post.date)) + '</time>' +
            '<span class="archive-post__title">' + escapeHtml(post.title) + '</span>' +
            '<span class="archive-post__category">' + escapeHtml(post.category) + '</span>' +
            '</button></li>';
        }).join('') + '</ul>' +
        '</section>';
    }).join('');
  }

  function matchesQuery(post, query) {
    var needle = query.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    var haystack = [post.title, post.excerpt, post.category].concat(post.tags).join(' ').toLowerCase();
    return haystack.indexOf(needle) !== -1;
  }

  function searchResultsFor(query) {
    return posts.filter(function (post) {
      return matchesQuery(post, query);
    });
  }

  function renderSearch() {
    var query = state.query.trim();
    if (!query) {
      el.searchResults.innerHTML = '';
      el.searchSummary.textContent = '';
      el.searchEmpty.hidden = true;
      el.searchResults.hidden = false;
      return;
    }

    var results = searchResultsFor(query);
    el.searchSummary.textContent = '“' + query + '” · 找到 ' + results.length + ' 篇演示文章';
    el.searchResults.innerHTML = results.map(function (post) {
      return postCardMarkup(post, { query: query });
    }).join('');
    el.searchResults.hidden = results.length === 0;
    el.searchEmpty.hidden = results.length !== 0;
  }

  function showSearchMode(active) {
    el.recentMetaWrap.hidden = active;
    el.postList.hidden = active;
    el.searchView.hidden = !active;
  }

  function syncSearchFields() {
    document.querySelectorAll('[data-role="search"]').forEach(function (field) {
      if (field.value !== state.query) {
        if (isUpgraded('mdui-text-field')) {
          field.value = state.query;
        } else {
          field.setAttribute('value', state.query);
        }
      }
    });
  }

  function setQuery(value, options) {
    var opts = options || {};
    var next = String(value == null ? '' : value);
    var wasSearching = isSearching();
    state.query = next;
    syncSearchFields();

    if (next.trim()) {
      if (state.tab !== 'recent') {
        switchTab('recent', {
          push: true,
          scroll: false,
          clearSearch: false
        });
      }
      renderSearch();
      showSearchMode(true);
      if (!wasSearching) {
        scrollToTabs();
      }
      if (opts.focus === 'title') {
        el.searchTitle.focus({ preventScroll: true });
      }
    } else {
      renderSearch();
      showSearchMode(false);
      if (opts.focus === 'tab') {
        var recentTab = document.getElementById('tab-recent');
        if (recentTab) {
          recentTab.focus({ preventScroll: true });
        }
      }
    }
  }

  function focusFirstResult() {
    var first = el.searchResults.querySelector('[data-post-id]');
    if (first) {
      first.focus({ preventScroll: false });
    }
  }

  function bindSearchField(field) {
    if (field.dataset.searchBound === 'true') {
      return;
    }
    field.dataset.searchBound = 'true';

    field.addEventListener('input', function () {
      setQuery(field.value);
    });

    field.addEventListener('keydown', function (event) {
      if (event.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        if (el.drawer && el.drawer.open) {
          return;
        }
        if (state.query) {
          event.preventDefault();
          setQuery('');
          field.focus({ preventScroll: true });
        }
        return;
      }

      if (event.key === 'Enter' && isSearching()) {
        event.preventDefault();
        if (el.drawer && el.drawer.open) {
          closeDrawerThen(focusFirstResult);
        } else {
          focusFirstResult();
        }
      }
    });
  }

  function renderSidebars() {
    var markup = sidebarMarkup();
    el.sidebarDesktop.innerHTML = markup;
    el.sidebarDrawer.innerHTML = markup;

    document.querySelectorAll('[data-role="search"]').forEach(function (field) {
      bindSearchField(field);
      if (isUpgraded('mdui-text-field')) {
        field.value = state.query;
      } else {
        field.setAttribute('value', state.query);
      }
    });
  }

  function updateTabAria() {
    getTabs().forEach(function (tab) {
      var active = tabValue(tab) === state.tab;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });
  }

  // 面板位于吸顶工具栏之外，以保留当前布局；同步外置面板及 ARIA。
  function showPanel(tab) {
    el.panels.forEach(function (panel) {
      panel.hidden = panel.dataset.tab !== tab;
    });
  }

  function switchTab(tab, options) {
    var opts = Object.assign({
      push: true,
      replaceHash: false,
      scroll: true,
      clearSearch: true
    }, options || {});

    if (TAB_IDS.indexOf(tab) === -1) {
      tab = 'recent';
    }

    if (opts.clearSearch && isSearching()) {
      setQuery('');
    }

    state.tab = tab;
    setTabsValue(tab);
    showPanel(tab);

    if (tab === 'recent') {
      showSearchMode(isSearching());
    }

    updateTabAria();

    if (opts.push && readHashTab() !== tab) {
      history.pushState({ tab: tab }, '', '#' + tab);
    } else if (opts.replaceHash) {
      history.replaceState({ tab: tab }, '', '#' + tab);
    }

    if (opts.scroll) {
      scrollToTabs();
    }
  }

  function readHashTab() {
    var raw = window.location.hash.replace(/^#\/?/, '');
    return TAB_IDS.indexOf(raw) !== -1 ? raw : '';
  }

  function syncFromLocation() {
    var tab = readHashTab() || 'recent';
    if (tab !== state.tab || isSearching()) {
      switchTab(tab, {
        push: false,
        scroll: false,
        clearSearch: true
      });
    }
  }

  function scrollToTabs() {
    if (!el.sentinel) {
      return;
    }
    var naturalTop = el.sentinel.getBoundingClientRect().top + window.scrollY;
    var target = Math.max(0, naturalTop - getStickyTop());
    if (window.scrollY > target + 40) {
      window.scrollTo({
        top: target,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    }
  }

  function setupTabs() {
    el.tabs.addEventListener('change', function (event) {
      if (event.target !== el.tabs) {
        return;
      }
      var value = el.tabs.value;
      if (value && value !== state.tab) {
        switchTab(value, { push: true, scroll: true });
      }
    });

    // 搜索时「最近发布」仍处于选中状态，再点它相当于退出搜索。
    el.tabs.addEventListener('click', function (event) {
      var tab = event.target.closest ? event.target.closest('mdui-tab') : null;
      if (tab && tabValue(tab) === 'recent' && isSearching()) {
        setQuery('', { focus: 'tab' });
      }
    });

    // MDUI 2.1.5 没有内置 Tabs 键盘导航或 ARIA；仅补齐这些能力。
    // 激活仍通过组件的 click()/change 流程，避免维护第二套选中状态。
    el.tabs.addEventListener('keydown', function (event) {
      var tabs = getTabs();
      var current = event.target.closest ? event.target.closest('mdui-tab') : null;
      var index = tabs.indexOf(current);
      if (index === -1) {
        return;
      }

      var nextIndex = null;
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        current.click();
        return;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        var next = tabs[nextIndex];
        next.focus({ preventScroll: true });
        next.click();
      }
    });
  }

  function openDrawer(options) {
    var opts = options || {};
    state.focusSearchOnOpen = !!opts.focusSearch;
    setElementOpen(el.drawer, true);
  }

  function setupDrawer() {
    if (!el.drawer || !el.menuButton) {
      return;
    }

    el.menuButton.addEventListener('click', function () {
      openDrawer();
    });

    if (el.drawerClose) {
      el.drawerClose.addEventListener('click', function () {
        setElementOpen(el.drawer, false);
      });
    }

    el.drawer.addEventListener('open', function () {
      el.menuButton.setAttribute('aria-expanded', 'true');
    });

    el.drawer.addEventListener('opened', function () {
      if (state.focusSearchOnOpen) {
        var field = el.drawer.querySelector('[data-role="search"]');
        if (field) {
          field.focus({ preventScroll: true });
        }
        state.focusSearchOnOpen = false;
      }
    });

    el.drawer.addEventListener('close', function () {
      el.menuButton.setAttribute('aria-expanded', 'false');
      state.focusSearchOnOpen = false;
    });

    window.addEventListener('resize', function () {
      if (!isMobile() && el.drawer.open) {
        setElementOpen(el.drawer, false);
      }
    });

    // modal、close-on-esc 和 close-on-overlay-click 负责焦点约束与关闭。
    // MDUI 同时负责恢复打开前的焦点，不再另设 Tab/Escape 处理器。
  }

  function closeDrawerThen(callback) {
    el.drawer.addEventListener('closed', function () {
      // 2.1.5 在 closed 前排入焦点恢复任务；等它完成后再执行页面跳转。
      window.setTimeout(callback, 0);
    }, { once: true });
    setElementOpen(el.drawer, false);
  }

  function showPostDialog(post) {
    el.dialog.headline = post.title;
    el.dialog.setAttribute('aria-label', post.title);
    el.dialogMeta.innerHTML = '<time datetime="' + attr(post.date) + '">' + escapeHtml(formatDate(post.date)) + '</time>' +
      '<span class="meta-sep" aria-hidden="true">·</span>' +
      '<span>' + escapeHtml(post.category) + '</span>';
    el.dialogExcerpt.textContent = post.excerpt;
    el.dialogTags.innerHTML = post.tags.map(function (tag) {
      return '<span class="tag-static">#' + escapeHtml(tag) + '</span>';
    }).join('');
    setElementOpen(el.dialog, true);
  }

  function openPost(postId) {
    var post = postById.get(postId);
    if (!post) {
      return;
    }

    if (el.drawer && el.drawer.open) {
      closeDrawerThen(function () {
        // 抽屉已隐藏，使用可见的打开按钮作为对话框返回焦点。
        el.menuButton.focus({ preventScroll: true });
        showPostDialog(post);
      });
    } else {
      showPostDialog(post);
    }
  }

  function setupDialog() {
    if (!el.dialog) {
      return;
    }

    if (el.dialogClose) {
      el.dialogClose.addEventListener('click', function () {
        setElementOpen(el.dialog, false);
      });
    }

    // MDUI Dialog 内置焦点约束、Escape/遮罩关闭和触发器焦点恢复。
  }

  function setupDelegation() {
    document.addEventListener('click', function (event) {
      var target = event.target;

      var postButton = target.closest ? target.closest('[data-post-id]') : null;
      if (postButton) {
        event.preventDefault();
        openPost(postButton.dataset.postId);
        return;
      }

      var tagButton = target.closest ? target.closest('[data-tag]') : null;
      if (tagButton) {
        event.preventDefault();
        setQuery(tagButton.dataset.tag, { focus: 'title' });
        return;
      }

      var action = target.closest ? target.closest('[data-action]') : null;
      if (action && action.dataset.action === 'clear-search') {
        event.preventDefault();
        setQuery('', { focus: 'tab' });
        return;
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey ||
          event.isComposing || event.defaultPrevented || el.dialog.open ||
          document.querySelector('mdui-dropdown[open]')) {
        return;
      }

      var active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable ||
        (active.closest && active.closest('mdui-text-field'))
      )) {
        return;
      }

      event.preventDefault();
      if (isMobile()) {
        if (el.drawer) {
          if (el.drawer.open) {
            var drawerField = el.drawer.querySelector('[data-role="search"]');
            if (drawerField) {
              drawerField.focus();
            }
          } else {
            openDrawer({ focusSearch: true });
          }
        }
      } else {
        var field = el.sidebarDesktop.querySelector('[data-role="search"]');
        if (field) {
          field.focus();
        }
      }
    });
  }

  function setupStickyState() {
    var ticking = false;

    function update() {
      ticking = false;
      if (!el.tabsSticky) {
        return;
      }
      var top = getStickyTop();
      var rect = el.tabsSticky.getBoundingClientRect();
      el.tabsSticky.classList.toggle('is-stuck', rect.top <= top + 0.5);
    }

    function requestUpdate() {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();
  }

  function setupImageFallbacks() {
    document.addEventListener('error', function (event) {
      var target = event.target;
      if (!target || !target.matches) {
        return;
      }

      if (target.matches('[data-avatar]')) {
        var avatar = target.closest('.avatar');
        if (avatar) {
          avatar.classList.add('is-fallback');
          target.remove();
        }
      }

      if (target.matches('[data-cover]')) {
        var card = target.closest('.post-card');
        if (card) {
          card.classList.remove('post-card--with-cover');
          var cover = target.closest('.post-cover');
          if (cover) {
            cover.remove();
          }
        }
      }
    }, true);
  }

  function setSiteName() {
    document.querySelectorAll('[data-site-name]').forEach(function (node) {
      node.textContent = site.name || '小林的小窝';
    });
    var pageHeading = document.querySelector('.main > h1');
    if (pageHeading) {
      pageHeading.textContent = (site.name || '小林的小窝') + ' — 首页';
    }
    document.title = (site.name || '小林的小窝') + ' · ' + (site.tagline || '分享技术、日常');
  }

  function initTabFromHash() {
    var hashTab = readHashTab();
    var initial = hashTab || 'recent';
    switchTab(initial, {
      push: false,
      scroll: false,
      clearSearch: false
    });

    if (!hashTab) {
      history.replaceState({ tab: initial }, '', '#' + initial);
    }
  }

  function init() {
    setSiteName();
    renderSidebars();
    renderArticleList();
    renderCategories();
    renderTags();
    renderArchive();
    renderSearch();
    showSearchMode(false);

    setupTabs();
    setupDrawer();
    setupDialog();
    setupDelegation();
    setupStickyState();
    setupImageFallbacks();
    initTabFromHash();

    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
