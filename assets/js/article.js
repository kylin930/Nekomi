/* 元数据与可信正文片段分离；文章路由不依赖客户端路由器。 */
(function () {
  'use strict';
  if (!window.NekomiSite) {
    document.getElementById('loading-note').textContent = '页面暂时未能加载，请检查网络后刷新。';
    return;
  }
  var Site = NekomiSite;
  var params = new URLSearchParams(location.search);
  var post = Site.posts.find(function (item) { return item.id === params.get('post'); });
  var body = document.getElementById('article-body');
  var reader = document.getElementById('reader');
  var headings = [];
  var tocLinks = [];
  var ticking = false;
  var tocMoving = false;
  var pendingHashScroll = null;
  function fail(kind) {
    var missing = kind === 'not-found';
    document.title = (missing ? '文章未找到' : '文章暂时不可用') + ' · ' + NekomiData.site.name;
    document.getElementById('article-error-title').textContent = missing ? '没有找到这篇文章' : '正文暂时无法载入';
    document.getElementById('article-error-message').textContent = missing
      ? '链接可能有误，或者这篇文章还没有收录。可以回到列表，看看其他记录。'
      : '请稍后重新加载，也可以先回到文章列表。';
    var error = document.getElementById('article-error');
    error.dataset.kind = kind;
    error.hidden = false;
    document.getElementById('article-retry').hidden = missing;
    document.getElementById('article-retry').addEventListener('click', function () { location.reload(); });
    Site.ready();
  }
  if (!post) { fail('not-found'); return; }

  function parseContent(source) {
    var parsed = new DOMParser().parseFromString(source, 'text/html');
    var allowed = new Set('p h2 h3 h4 h5 h6 ul ol li blockquote hr table caption thead tbody tfoot tr th td a img figure figcaption pre code strong em del s kbd mark sup sub abbr br span section div'.split(' '));
    var blocked = new Set('script style link meta base iframe object embed form input button textarea select svg math'.split(' '));
    var attributes = new Set('href src alt title width height colspan rowspan scope id start reversed target'.split(' '));
    Array.from(parsed.body.querySelectorAll('*')).forEach(function (element) {
      var tag = element.localName;
      if (blocked.has(tag)) { element.remove(); return; }
      if (!allowed.has(tag)) { element.replaceWith.apply(element, Array.from(element.childNodes)); return; }
      Array.from(element.attributes).forEach(function (attr) {
        if (!(attributes.has(attr.name) || (tag === 'code' && attr.name === 'class' && /^language-[a-z0-9+-]+$/i.test(attr.value)))) element.removeAttribute(attr.name);
      });
      if (element.hasAttribute('href')) {
        try {
          if (!['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(element.getAttribute('href'), location.href).protocol)) element.removeAttribute('href');
        } catch (_) { element.removeAttribute('href'); }
      }
      if (element.hasAttribute('src') && !Site.safeUrl(element.getAttribute('src'))) element.removeAttribute('src');
      if (element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer');
      if (tag === 'img') { element.loading = 'lazy'; element.decoding = 'async'; }
    });
    return Array.from(parsed.body.childNodes);
  }
  function prepareHeadings() {
    var used = new Set(Array.from(document.querySelectorAll('[id]')).filter(function (element) { return !body.contains(element) || !element.matches('h2, h3, h4, h5, h6'); }).map(function (element) { return element.id; }));
    headings = Array.from(body.querySelectorAll('h2, h3, h4, h5, h6')).map(function (element) {
      var label = element.textContent.trim();
      var base = element.id || label.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
      var id = base, suffix = 2;
      while (used.has(id)) id = base + '-' + suffix++;
      used.add(id);
      element.id = id;
      element.tabIndex = -1;
      var permalink = document.createElement('a');
      permalink.className = 'heading-anchor';
      permalink.href = '#' + encodeURIComponent(id);
      permalink.setAttribute('aria-label', '定位到：' + label);
      permalink.textContent = '#';
      element.append(permalink);
      return { element: element, label: label, level: Number(element.localName.slice(1)), children: [] };
    });
    var roots = [], stack = [];
    headings.forEach(function (heading) {
      while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
      if (stack.length) stack[stack.length - 1].children.push(heading); else roots.push(heading);
      stack.push(heading);
    });
    function tree(nodes, root) {
      return '<ol' + (root ? ' class="toc-list"' : '') + '>' + nodes.map(function (heading) {
        return '<li><a href="#' + encodeURIComponent(heading.element.id) + '">' + Site.html(heading.label) + '</a>' +
          (heading.children.length ? tree(heading.children, false) : '') + '</li>';
      }).join('') + '</ol>';
    }
    document.getElementById('toc-desktop-list').innerHTML = tree(roots, true);
    document.getElementById('toc-inline-list').innerHTML = tree(roots, true);
    document.getElementById('toc-toggle-label').textContent = '文章目录 · ' + headings.length + ' 个章节';
    document.getElementById('reading-toc').hidden = !headings.length;
    document.querySelector('.toc-inline').hidden = !headings.length;
    tocLinks = Array.from(document.querySelectorAll('.toc-list a'));
  }
  function currentSection() {
    ticking = false;
    if (!headings.length) return;
    var appbar = document.querySelector('.site-appbar');
    var offset = appbar.getBoundingClientRect().height + 32;
    var current = headings[0];
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].element.getBoundingClientRect().top <= offset) current = headings[i]; else break;
    }
    if (Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 3) current = headings[headings.length - 1];
    tocLinks.forEach(function (link) {
      if (link.hash === '#' + encodeURIComponent(current.element.id)) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function requestSectionUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(currentSection); }
  }
  function scrollHash(smooth) {
    // 折叠目录仍在改变正文位置时，等待组件完成展开/收起后再定位。
    if (tocMoving && document.querySelector('.toc-inline').getClientRects().length) {
      pendingHashScroll = smooth;
      return;
    }
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    var target = document.getElementById(id);
    if (!target || !body.contains(target)) return;
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
    requestSectionUpdate();
  }
  function settleToc() {
    tocMoving = false;
    if (pendingHashScroll !== null) {
      var smooth = pendingHashScroll;
      pendingHashScroll = null;
      requestAnimationFrame(function () { scrollHash(smooth); });
    }
  }
  function legacyCopy(text) {
    var active = document.activeElement;
    var field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.style.position = 'fixed';
    field.style.left = '-9999px';
    field.setAttribute('aria-hidden', 'true');
    document.body.append(field);
    field.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } finally { field.remove(); active.focus({ preventScroll: true }); }
    return copied;
  }
  async function copyCode(button, code) {
    var copied = false;
    try {
      if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(code.textContent); copied = true; }
    } catch (_) { /* 权限受限时尝试用户点击触发的传统复制。 */ }
    if (!copied) {
      try { copied = legacyCopy(code.textContent); } catch (_) { copied = false; }
    }
    Site.notify(copied ? '代码已复制' : '复制失败，请手动选择代码。');
    if (copied) {
      button.textContent = '已复制';
      setTimeout(function () { button.textContent = '复制'; }, 2000);
    }
  }
  function prepareContent() {
    body.querySelectorAll('pre').forEach(function (pre, index) {
      var code = pre.querySelector('code');
      if (!code) return;
      var language = (code.className.match(/language-([a-z0-9+-]+)/i) || [])[1] || 'text';
      var figure = document.createElement('figure');
      figure.className = 'code-block';
      var header = document.createElement('div');
      header.className = 'code-header';
      var label = document.createElement('span');
      label.textContent = language.toUpperCase();
      label.id = 'code-label-' + index;
      var button = document.createElement('mdui-button');
      button.variant = 'text';
      button.className = 'copy-code';
      button.textContent = '复制';
      header.append(label, button);
      pre.replaceWith(figure);
      figure.append(header, pre);
      pre.tabIndex = 0;
      pre.setAttribute('role', 'region');
      pre.setAttribute('aria-label', language.toUpperCase() + ' 代码，可横向滚动');
      NekomiA11y.buttonState(button, { 'aria-label': '复制 ' + language.toUpperCase() + ' 代码' });
      button.addEventListener('click', function () { copyCode(button, code); });
    });
    body.querySelectorAll('table').forEach(function (table) {
      var wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', (table.caption ? table.caption.textContent : '文章表格') + '，可横向滚动');
      table.replaceWith(wrapper);
      wrapper.append(table);
    });
  }
  function neighbors() {
    var index = Site.posts.indexOf(post);
    function entry(item, label, direction) {
      return item ? '<mdui-card variant="outlined" clickable class="article-neighbor" data-direction="' + direction + '" href="' + Site.postLink(item) + '">' +
        '<span class="neighbor-label">' + label + '</span><strong>' + Site.html(item.title) + '</strong></mdui-card>' :
        '<div class="neighbor-boundary"><span>' + label + '</span><p>' + (direction === 'previous' ? '已经是最新的一篇' : '已经是最早的一篇') + '</p></div>';
    }
    document.getElementById('article-neighbors').innerHTML = entry(Site.posts[index - 1], '上一篇', 'previous') + entry(Site.posts[index + 1], '下一篇', 'next');
  }
  async function load() {
    try {
      var url = new URL(post.content, location.href);
      var contentRoot = new URL('content/posts/', location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith(contentRoot.pathname)) throw new Error('Invalid content path');
      var response = await fetch(url, { headers: { Accept: 'text/html' } });
      if (!response.ok) throw new Error('Content unavailable');
      var nodes = parseContent(await response.text());
      body.replaceChildren.apply(body, nodes);
      if (!body.textContent.trim()) throw new Error('Empty article');
      document.title = post.title + ' · ' + NekomiData.site.name;
      document.querySelector('meta[name="description"]').content = post.excerpt;
      document.getElementById('article-title').textContent = post.title;
      document.getElementById('article-source').textContent = NekomiData.site.name + ' · 阅读演示';
      document.getElementById('article-category').textContent = post.category;
      document.getElementById('article-category').href = Site.filterLink(post.category);
      var date = document.getElementById('article-date');
      date.dateTime = post.date;
      date.textContent = Site.dateLabel(post.date);
      document.getElementById('article-tags').innerHTML = post.tags.map(function (tag) { return Site.chip(tag); }).join('');
      if (Site.safeUrl(post.cover)) document.getElementById('article-hero').innerHTML = '<figure class="article-hero"><img src="' + Site.html(Site.safeUrl(post.cover)) + '" alt="' + Site.html(post.coverAlt || '') + '" data-hero></figure>';
      prepareContent();
      prepareHeadings();
      neighbors();
      reader.hidden = false;
      var toggle = document.getElementById('toc-toggle');
      NekomiA11y.buttonState(toggle, { 'aria-expanded': 'false', 'aria-controls': 'toc-inline-list' });
      ['open', 'close'].forEach(function (type) {
        document.getElementById('inline-toc-item').addEventListener(type, function () {
          tocMoving = true;
          NekomiA11y.buttonState(toggle, { 'aria-expanded': String(type === 'open') });
          document.getElementById('toc-toggle-icon').name = type === 'open' ? 'expand_less' : 'expand_more';
        });
      });
      ['opened', 'closed'].forEach(function (type) {
        document.getElementById('inline-toc-item').addEventListener(type, settleToc);
      });
      document.addEventListener('click', function (event) {
        var anchor = event.target.closest('.toc-list a, .heading-anchor, .prose a[href^="#"]');
        if (!anchor || event.metaKey || event.ctrlKey || event.altKey || event.button) return;
        var target;
        try { target = document.getElementById(decodeURIComponent(anchor.hash.slice(1))); } catch (_) { return; }
        if (!target || !body.contains(target)) return;
        event.preventDefault();
        if (location.hash !== anchor.hash) history.pushState(null, '', anchor.hash);
        scrollHash(true);
      });
      window.addEventListener('hashchange', function () { scrollHash(false); });
      window.addEventListener('scroll', requestSectionUpdate, { passive: true });
      window.addEventListener('resize', function () {
        if (tocMoving && !document.querySelector('.toc-inline').getClientRects().length) settleToc();
        requestSectionUpdate();
      });
      Site.ready();
      requestAnimationFrame(function () { scrollHash(false); currentSection(); });
    } catch (_) { fail('unavailable'); }
  }
  load();
}());
