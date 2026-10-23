"""P2 production-static browser regression. No Node server is used by these tests."""
import argparse
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import urlsplit, unquote, urljoin
from playwright.sync_api import expect, sync_playwright
from motion_audit import motion_checks, copy_checks, shared_cover_checks

ROOT = Path(__file__).resolve().parents[1]
TECH = 'css-grid-two-column-blog'
ESSAY = 'weekend-walk-by-river'
BASELINE = json.loads((ROOT / 'tests/fixtures/content-baseline.json').read_text())
EDITORIAL = json.loads((ROOT / 'tests/fixtures/editorial-p23.json').read_text())
VIEWPORTS = [(1440, 900), (1360, 900), (1359, 900), (1280, 800), (1024, 768), (960, 720), (390, 844), (320, 700)]


class StaticHandler(http.server.SimpleHTTPRequestHandler):
    """A regular file server, including the custom 404, with optional subpath mounting."""
    base = '/'

    def log_message(self, *args):
        pass

    def translate_path(self, path):
        path = urlsplit(path).path
        if self.base != '/' and path.startswith(self.base):
            path = '/' + path[len(self.base):]
        return super().translate_path(path)

    def send_error(self, code, message=None, explain=None):
        error = Path(self.directory) / '404.html'
        if code == 404 and error.exists():
            body = error.read_bytes()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
        else:
            super().send_error(code, message, explain)


def start_server(directory, base='/'):
    handler = type('MountedStaticHandler', (StaticHandler,), {'base': base})
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(handler, directory=str(directory)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f'http://127.0.0.1:{server.server_port}{base}'


def ready(page):
    page.wait_for_function('window.NekomiTheme && document.querySelector("main")?.dataset.enhanced === "true"')


def article(page, url, post=TECH, fragment=''):
    page.goto(url + 'posts/' + post + '/' + fragment, wait_until='networkidle')
    ready(page)
    expect(page.locator('#reader')).to_be_visible()


def settled(page):
    page.wait_for_function('!NekomiMotion.isScrolling()')


def inline_toc_click(page, heading):
    page.evaluate('window.tocClosed=false;document.querySelector("#inline-toc-item").addEventListener("closed",()=>window.tocClosed=true,{once:true})')
    page.locator('#toc-inline-list a[href="#' + heading + '"]').click()
    page.wait_for_function('window.tocClosed')


def selected(page, tab):
    expect(page.locator('#content-tabs')).to_have_attribute('value', tab)
    expect(page.locator('#panel-' + tab)).to_be_visible()
    expect(page.locator('#content-tabs mdui-tab-panel:visible')).to_have_count(1)
    expect(page.locator('#tab-' + tab)).to_have_attribute('aria-selected', 'true')


def persistence_checks(page, context, url, requests):
    ready(page)
    page.wait_for_function('document.querySelector(".wallpaper-image")?.naturalWidth > 0')
    page.wait_for_timeout(750)
    page.evaluate('''() => {
      window.saved = { marker: Math.random(), origin: performance.timeOrigin,
        wallpaper: document.querySelector('.site-wallpaper'), image: document.querySelector('.wallpaper-image'),
        sidebar: document.querySelector('.sidebar'), drawer: document.querySelector('#mobile-drawer'),
        theme: NekomiTheme, listItem: customElements.get('mdui-list-item'), palette: document.querySelector('style[id^="mdui-custom-color-scheme"]') };
      window.imageLoads = 0; saved.image.addEventListener('load', () => imageLoads++);
      window.refades = 0;
      new MutationObserver(() => { if (!saved.image.classList.contains('is-visible')) refades++; }).observe(saved.image, {attributes:true,attributeFilter:['class']});
      window.transitions = [];
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = callback => { const vt=start(callback); vt.ready.then(() => transitions.push({
        enter: getComputedStyle(document.documentElement, '::view-transition-new(page-content)').animationName,
        root: getComputedStyle(document.documentElement, '::view-transition-new(root)').animationName
      })); return vt; };
    }''')
    page.locator('#side-desktop-comments').click()
    page.evaluate("NekomiTheme.setMode('dark')")
    page.locator('#post-list .post-title a').first.click()
    page.wait_for_url(url + 'posts/' + TECH + '/')
    ready(page)
    page.locator('[data-direction=next]').click()
    page.wait_for_url(url + 'posts/md3-palette-for-blog/')
    ready(page)
    # Clicking the slotted icon must also take ClientRouter's path through MDUI's nested shadow roots.
    page.locator('.reader-breadcrumb mdui-icon').click()
    page.wait_for_url(url + '#recent')
    ready(page)
    for _ in range(4):
        page.locator('#post-list .post-title a').first.click()
        page.wait_for_url(url + 'posts/' + TECH + '/')
        ready(page)
        page.locator('.reader-breadcrumb mdui-button').click()
        page.wait_for_url(url + '#recent')
        ready(page)
    page.wait_for_timeout(750)
    assert page.evaluate('''saved.origin === performance.timeOrigin && saved.wallpaper === document.querySelector('.site-wallpaper') &&
      saved.image === document.querySelector('.wallpaper-image') && saved.image.parentElement === saved.wallpaper &&
      saved.sidebar === document.querySelector('.sidebar') && saved.drawer === document.querySelector('#mobile-drawer') &&
      saved.theme === NekomiTheme && saved.listItem === customElements.get('mdui-list-item') && !window.mdui && !customElements.get('mdui-slider') && saved.palette === document.querySelector('style[id^="mdui-custom-color-scheme"]')''')
    assert page.evaluate('imageLoads === 0 && wallpaperDecodes === 1 && refades === 0')
    assert page.evaluate('transitions.length >= 11 && transitions.every(t=>t.enter.includes("nekomi-in") && !t.root.includes("fade"))')
    expect(page.locator('.sidebar .sidebar-tabs')).to_have_attribute('value', 'comments')
    assert page.evaluate("NekomiTheme.getMode() === 'dark'")
    assert len([r for r in requests if r['type'] == 'document']) == 1
    assert len([r for r in requests if r['url'].startswith('https://www.nekopara.uk/pic_api')]) == 1
    assert not any('unpkg.com' in r['url'] for r in requests)
    expect(page.locator('.site-wallpaper')).to_have_count(1)
    expect(page.locator('style[id^="mdui-custom-color-scheme"]')).to_have_count(1)
    expect(page.locator('.astro-route-announcer')).to_have_count(1)
    # A single click advances one mode, after repeated round trips.
    page.locator('.sidebar-settings [data-theme-cycle]').click()
    assert page.evaluate("NekomiTheme.getMode() === 'auto'")
    print('PASS persistence: no document reload with Worker blocked; exact wallpaper/image/palette/MDUI/shell identity, one API request/decode, sidebar state, one theme handler')


def home_checks(page, context, url, requests):
    ready(page)
    expect(page.locator('.post-card')).to_have_count(10)
    page.locator('#post-list .post-title a').first.click()
    page.wait_for_url(url + 'posts/' + TECH + '/')
    ready(page)
    page.go_back()
    page.wait_for_url(url + '#recent')
    ready(page)
    expect(page.locator('#post-list')).to_be_visible()
    for tab in ('categories', 'tags', 'archive', 'recent'):
        page.locator('#tab-' + tab).click()
        selected(page, tab)
    page.locator('#tab-recent').focus()
    for key, tab in [('ArrowRight', 'categories'), ('End', 'archive'), ('Home', 'recent'), ('ArrowLeft', 'archive')]:
        page.keyboard.press(key)
        selected(page, tab)
        expect(page.locator('#tab-' + tab)).to_be_focused()
    page.go_back()
    ready(page)
    selected(page, 'recent')
    field = page.locator('[data-sidebar=desktop] [data-search] input')
    field.fill('CSS')
    expect(page.locator('.post-card:visible')).to_have_count(2)
    assert '?q=CSS' in page.url
    expect(page.locator('#post-list mark')).not_to_have_count(0)
    page.reload(wait_until='networkidle')
    ready(page)
    expect(page.locator('.post-card:visible')).to_have_count(2)
    field.fill('这个词不存在')
    expect(page.locator('#search-empty')).to_be_visible()
    page.keyboard.press('Enter')
    expect(page.locator('#feed-title')).to_be_focused()
    page.locator('[data-clear-search]').first.click()
    expect(page.locator('.post-card:visible')).to_have_count(10)
    page.locator('#tab-categories').click()
    page.locator('#categories-list [data-query="设计"]').click()
    selected(page, 'recent')
    expect(page.locator('.post-card:visible')).to_have_count(2)
    field.focus()
    page.keyboard.press('Escape')
    expect(page.locator('.post-card:visible')).to_have_count(10)
    page.locator('#tab-tags').click()
    page.locator('#tags-list [data-query="JavaScript"]').click()
    expect(page.locator('.post-card:visible')).to_have_count(3)
    page.goto(url + '?q=CSS#recent', wait_until='networkidle')
    ready(page)
    # Native MDUI button navigation, then history, preserve the search URL/state.
    page.locator('.post-card:visible mdui-button[data-post]').first.click()
    page.wait_for_url(url + 'posts/' + TECH + '/')
    ready(page)
    page.go_back()
    page.wait_for_url(url + '?q=CSS#recent')
    ready(page)
    expect(page.locator('.post-card:visible')).to_have_count(2)
    expect(field).to_have_value('CSS')
    print('PASS P0: all tabs, keyboard/history, search/highlight/empty/clear/filters/query refresh, native MDUI article links and back to both default and filtered home')


def content_checks(page, context, url, requests):
    context.grant_permissions(['clipboard-read', 'clipboard-write'])
    for original in BASELINE:
        article(page, url, original['id'])
        body = page.locator('#article-body').evaluate('''e => { const clone=e.cloneNode(true); clone.querySelectorAll('.heading-anchor,.code-header').forEach(n=>n.remove()); return clone.textContent; }''')
        digest = hashlib.sha256(re.sub(r'\s', '', body).encode()).hexdigest()
        edit = EDITORIAL.get(original['id'], {})
        assert digest == edit.get('textSha256', original['textSha256']), ('lost or changed content', original['id'], digest)
        assert page.locator('.prose h2,.prose h3,.prose h4,.prose h5,.prose h6').evaluate_all('es=>es.map(e=>({id:e.id,text:e.firstChild.textContent,level:Number(e.tagName.slice(1))}))') == [{**h, 'text': edit.get('headingText', {}).get(h['id'], h['text'])} for h in original['headings']]
        for index, code in enumerate(original['code']):
            expected = edit.get('code', {}).get(str(index), code)
            assert page.locator('.code-block code').nth(index).text_content().rstrip('\n') == expected.rstrip('\n')
        expect(page.locator('#article-title')).to_have_text(edit.get('title', original['metadata']['title']))
    article(page, url)
    code = page.locator('.code-block code').first.text_content()
    page.locator('.copy-code').first.click()
    expect(page.locator('#site-feedback')).to_contain_text('代码已复制')
    assert page.evaluate('navigator.clipboard.readText()') == code
    expect(page.locator('#toc-desktop-list mdui-list')).to_have_count(1)
    expect(page.locator('#toc-desktop-list mdui-list-item[data-depth="4"]')).to_have_count(1)
    expect(page.locator('#toc-desktop-list mdui-list-item[rounded]')).to_have_count(len(BASELINE[0]['headings']))
    expect(page.locator('.prose table caption')).to_contain_text('布局决策示例')
    page.locator('.prose img').scroll_into_view_if_needed()
    page.wait_for_function('document.querySelector(".prose img").naturalWidth > 0')
    expect(page.locator('#article-hero img')).to_have_count(0)
    for width in (390, 320):
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.locator('.table-scroll').evaluate('e=>e.scrollWidth>e.clientWidth')
        assert page.locator('pre').last.evaluate('e=>e.scrollWidth>e.clientWidth')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.goto(url + 'article.html?post=' + TECH + '#grid-minimum', wait_until='networkidle')
    page.wait_for_url(url + 'posts/' + TECH + '/#grid-minimum')
    ready(page)
    expect(page.locator('#grid-minimum')).to_be_focused()
    response = page.goto(url + 'posts/unknown-article/', wait_until='networkidle')
    assert response.status == 404
    ready(page)
    expect(page.locator('#article-error')).to_be_visible()
    print('PASS P1/content: all ten editorial text hashes, original heading IDs and exact code with explicit P2.3 editorial patches, clipboard/images/tables/overflow, old URL compatibility and static 404')


def reader_checks(page, context, url, requests):
    article(page, url)
    page.locator('#toc-desktop-list a[href="#state"]').click()
    page.wait_for_function('NekomiMotion.isScrolling() && scrollY>40')
    page.mouse.wheel(0, -100)
    page.wait_for_function('!NekomiMotion.isScrolling()')
    page.locator('#toc-desktop-list a[href="#keyboard"]').click()
    page.wait_for_function('NekomiMotion.isScrolling()')
    page.locator('#toc-desktop-list a[href="#grid-minimum"]').click()
    settled(page)
    expect(page.locator('#grid-minimum')).to_be_focused()
    assert abs(page.locator('#grid-minimum').bounding_box()['y'] - 28) <= 1
    expect(page.locator('#toc-desktop-list a[href="#grid-minimum"]')).to_have_attribute('aria-current', 'location')
    page.go_back()
    page.wait_for_url('**/#keyboard')
    expect(page.locator('#keyboard')).to_be_focused()
    page.go_forward()
    page.wait_for_url('**/#grid-minimum')
    expect(page.locator('#grid-minimum')).to_be_focused()
    page.reload(wait_until='networkidle')
    ready(page)
    expect(page.locator('#grid-minimum')).to_be_focused()
    page.set_viewport_size({'width':960,'height':720})
    page.evaluate('window.tocOpened=false;document.querySelector("#inline-toc-item").addEventListener("opened",()=>window.tocOpened=true,{once:true})')
    page.locator('#toc-toggle button').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#toc-toggle button')).to_have_attribute('aria-expanded','true')
    page.wait_for_function('window.tocOpened')
    inline_toc_click(page, 'state')
    settled(page)
    assert abs(page.locator('#state').bounding_box()['y'] - 84) <= 1
    page.set_viewport_size({'width': 390, 'height': 844})
    article(page, url)
    # Removing a fragment can be a same-document navigation. Start this separate
    # interaction phase with a genuinely closed native Collapse at the top.
    page.reload(wait_until='networkidle');ready(page)
    page.evaluate('scrollTo(0,0);window.tocOpened=false;document.querySelector("#inline-toc-item").addEventListener("opened",()=>window.tocOpened=true,{once:true})')
    page.locator('#toc-toggle').click()
    expect(page.locator('#toc-toggle button')).to_have_attribute('aria-expanded', 'true')
    page.wait_for_function('window.tocOpened')
    inline_toc_click(page, 'state')
    page.wait_for_function('NekomiMotion.isScrolling()')
    page.evaluate('dispatchEvent(new Event("touchstart"))')
    assert not page.evaluate('NekomiMotion.isScrolling()')
    page.locator('#toc-toggle').click()
    page.wait_for_timeout(400)
    inline_toc_click(page, 'state')
    settled(page)
    assert abs(page.locator('#state').bounding_box()['y'] - 84) <= 1
    page.locator('#toc-toggle').click()
    page.wait_for_timeout(400)
    page.emulate_media(reduced_motion='reduce')
    inline_toc_click(page, 'grid-minimum')
    assert not page.evaluate('NekomiMotion.isScrolling()')
    expect(page.locator('#grid-minimum')).to_be_focused()
    assert page.locator('.wallpaper-image').evaluate('e=>getComputedStyle(e).transitionDuration') == '0.001s'
    print('PASS reading: nested/current TOC, spring interruption/repeat/offset/bounds, hash/reload/history/focus, native mobile collapse, reduced motion')


def engineering_checks(page, context, url, requests):
    ready(page)
    # Opt-in only: an idle page must not prefetch every article in view.
    assert not any('/posts/' in r['url'] for r in requests), requests
    target = url + 'posts/' + TECH + '/'
    page.locator('.post-title a').first.hover()
    page.wait_for_timeout(250)
    assert len([r for r in requests if r['url'] == target]) == 1
    assert page.locator('link[rel=prefetch]').evaluate_all('(es,u)=>es.some(e=>e.href===u)', target)
    page.mouse.move(0, 0)
    page.locator('.post-title a').first.hover()
    page.wait_for_timeout(250)
    assert len([r for r in requests if r['url'] == target]) == 1
    page.locator('.post-card mdui-button[data-post]').first.hover()
    page.wait_for_timeout(250)
    assert len([r for r in requests if r['url'] == target]) == 1
    page.locator('.post-title a').first.click()
    page.wait_for_url(target);ready(page)
    expect(page.locator('pre.astro-code')).to_have_count(2)
    expect(page.locator('.code-block .code-block')).to_have_count(0)
    expect(page.locator('.code-header')).to_have_count(2)
    expect(page.locator('.code-header').first).to_contain_text('CSS')
    colors = []
    for mode in ('light','dark'):
        page.evaluate('m=>NekomiTheme.setMode(m)',mode)
        palette = page.locator('pre.astro-code span[style]').evaluate_all('es=>[...new Set(es.map(e=>getComputedStyle(e).color))]')
        assert len(palette) > 2, palette
        colors.append(palette)
    assert colors[0] != colors[1]
    page.evaluate("NekomiTheme.setMode('auto')")
    for scheme, palette in zip(('light','dark'),colors):
        page.emulate_media(color_scheme=scheme)
        assert page.locator('pre.astro-code span[style]').evaluate_all('es=>[...new Set(es.map(e=>getComputedStyle(e).color))]') == palette
    image = page.locator('.prose img')
    image.scroll_into_view_if_needed()
    page.wait_for_function('document.querySelector(".prose img").naturalWidth > 0')
    assert image.get_attribute('src').startswith(urlsplit(url).path + '_astro/')
    assert '.webp' in image.get_attribute('src') and '640w' in image.get_attribute('srcset')
    assert image.get_attribute('width') == '1440' and image.get_attribute('height') == '900'
    assert '__ASTRO_IMAGE_' not in page.content()
    # MDUI shadow links use Astro's public prefetch API too, without eagerly
    # discovering sidebar, tags or every native component link.
    next_link = page.locator('[data-direction=next]')
    next_url = next_link.get_attribute('href')
    next_link.hover();page.wait_for_timeout(250)
    assert len([r for r in requests if r['url'] == urljoin(url, next_url)]) == 1
    # Current section uses native active on both responsive copies, and forwards
    # aria-current to the actual shadow anchor for screen readers.
    page.locator('#toc-desktop-list a[href="#grid-minimum"]').click();settled(page)
    expect(page.locator('#toc-desktop-list mdui-list-item[active]')).to_have_count(1)
    expect(page.locator('#toc-inline-list mdui-list-item[active]')).to_have_count(1)
    expect(page.locator('#toc-desktop-list mdui-list-item[active] a')).to_have_attribute('aria-current','location')
    # Extremely long labels and H2-H6 offsets must not widen the reading shell.
    for depth in range(2,7):
        item = page.locator('#toc-desktop-list mdui-list-item').first
        item.evaluate('(e,d)=>{e.style.setProperty("--toc-depth",d-2);e.textContent="长标题"+"verylongunbrokenheading".repeat(8)}', depth)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert item.evaluate('e=>e.scrollWidth<=e.clientWidth')
    page.set_viewport_size({'width':390,'height':844})
    article(page,url)
    appbar = page.locator('.site-appbar').bounding_box()
    reader = page.locator('#reader').bounding_box()
    assert 12 <= reader['y']-appbar['y']-appbar['height'] <= 16
    page.evaluate('scrollTo(0,0)')
    page.locator('#toc-toggle').click()
    page.wait_for_function('document.querySelector("#inline-toc-item").active')
    inline_toc_click(page, 'state')
    page.wait_for_function('!document.querySelector("#inline-toc-item").active && NekomiMotion.isScrolling()')
    settled(page)
    expect(page.locator('#state')).to_be_focused()
    expect(page.locator('#toc-toggle button')).to_have_attribute('aria-expanded','false')
    assert abs(page.locator('#state').bounding_box()['y'] - 84) <= 1
    print('PASS P2.2: selective/deduplicated hover prefetch incl. native shadow links, dual Shiki colors/exact wrappers, optimized responsive body image, native active TOC/long labels, mobile 16px App Bar gap and close-before-spring/focus')


def mobile_checks(page, context, url, requests):
    ready(page)
    page.locator('#menu-button').click()
    expect(page.locator('#drawer-close button')).to_be_focused()
    page.locator('#side-mobile-comments').click()
    expect(page.locator('#side-mobile-comments-panel')).to_be_visible()
    page.locator('#side-mobile-updates').click()
    page.locator('[data-sidebar=mobile] [data-search] input').fill('CSS')
    page.keyboard.press('Enter')
    expect(page.locator('#mobile-drawer')).to_be_hidden()
    expect(page.locator('#post-list .post-card:visible .post-title a').first).to_be_focused()
    page.locator('#menu-button').click()
    page.locator('#side-mobile-updates-panel mdui-list-item').first.click()
    page.wait_for_url(url + 'posts/' + TECH + '/')
    ready(page)
    expect(page.locator('#mobile-drawer')).to_be_hidden()
    assert page.evaluate('getComputedStyle(document.body).overflow') != 'hidden'
    page.locator('#menu-button').click()
    expect(page.locator('#side-mobile-comments')).to_have_attribute('aria-selected', 'false')
    field = page.locator('[data-sidebar=mobile] [data-search] input')
    field.fill('排版')
    page.keyboard.press('Enter')
    page.wait_for_url(url + '?q=' + '%E6%8E%92%E7%89%88' + '#recent')
    ready(page)
    expect(page.locator('.post-card:visible')).to_have_count(2)
    expect(page.locator('#mobile-drawer')).to_be_hidden()
    page.locator('#menu-button').click()
    page.set_viewport_size({'width': 1440, 'height': 900})
    expect(page.locator('#mobile-drawer')).to_be_hidden()
    page.set_viewport_size({'width': 390, 'height': 844})
    theme = page.locator('.site-appbar [data-theme-cycle]')
    page.evaluate("NekomiTheme.setMode('light')")
    for mode in ('dark', 'auto', 'light'):
        theme.click()
        assert page.evaluate('NekomiTheme.getMode()') == mode
    page.reload(wait_until='networkidle')
    ready(page)
    assert page.evaluate('NekomiTheme.getMode()') == 'light'
    page.evaluate("NekomiTheme.setMode('auto')")
    for scheme in ('dark', 'light'):
        page.emulate_media(color_scheme=scheme)
        assert page.evaluate('getComputedStyle(document.documentElement).colorScheme') == scheme
    page.set_viewport_size({'width': 960, 'height': 720})
    page.keyboard.press('/')
    expect(page.locator('#mobile-drawer')).to_be_visible()
    expect(page.locator('[data-sidebar=mobile] [data-search] input')).to_be_focused()
    page.set_viewport_size({'width': 1120, 'height': 800})
    expect(page.locator('#mobile-drawer')).to_be_hidden()
    expect(page.locator('.sidebar')).to_be_visible()
    print('PASS mobile: App Bar/Drawer focus/close/resize/scroll lock, native list SPA links, article search through ClientRouter, three-state theme/system/refresh')


def cache_checks(page, context, url, requests):
    page.wait_for_function('document.querySelector(".wallpaper-image")?.naturalWidth > 0')
    assert page.evaluate('navigator.serviceWorker.controller.scriptURL') == url + 'wallpaper-cache.js'
    assert page.locator('.wallpaper-image').get_attribute('src').startswith(url + '__nekomi_wallpaper?')
    assert page.evaluate('async()=>{const c=await caches.open("nekomi-wallpaper-v1");const keys=await c.keys();const key=keys.find(k=>!k.url.includes("metadata=1"));return (await c.match(key)).type === "opaque"}')
    page.reload(wait_until='networkidle')
    ready(page)
    page.wait_for_function('document.querySelector(".wallpaper-image")?.naturalWidth > 0')
    assert len([r for r in requests if r['url'].startswith('https://www.nekopara.uk/pic_api')]) == 1
    print('PASS auxiliary cache: correctly scoped real Worker, opaque cache response, refresh reuses one API request independently of in-page persistence')


def layout_checks(page, context, url, requests, artifacts):
    dimensions = []
    for width, height in VIEWPORTS + [(1119, 800), (1120, 800), (1439, 900)]:
        for route in ('', 'posts/' + TECH + '/'):
            page.set_viewport_size({'width': width, 'height': height})
            page.goto(url + route, wait_until='networkidle')
            ready(page)
            for mode in ('light', 'dark'):
                page.evaluate('mode=>NekomiTheme.setMode(mode)', mode)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                if width >= 1120:
                    expect(page.locator('.sidebar')).to_be_visible()
                    assert page.locator('.sidebar').evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgba(0, 0, 0, 0)'
                    assert page.locator('.sidebar').bounding_box()['width'] == 320
                    assert page.locator('.sidebar .site-avatar').evaluate('e=>getComputedStyle(e).borderRadius') == '50%'
                else:
                    expect(page.locator('.site-appbar')).to_be_visible()
                    assert page.locator('.site-layout').bounding_box()['y'] >= 64
                if route:
                    if width < 1120:
                        appbar = page.locator('.site-appbar').bounding_box()
                        top = page.locator('#reader').bounding_box()['y'] - appbar['y'] - appbar['height']
                        assert top == 16, (width, top)
                    assert page.locator('#reader').bounding_box()['width'] <= 760
                    expect(page.locator('#reading-toc') if width >= 1440 else page.locator('.toc-inline')).to_be_visible()
                    body = page.locator('.prose').bounding_box()
                    if width >= 1280 or 888 <= width < 1120:
                        assert body['width'] == 696, (width, body)
                    elif width >= 1120:
                        assert body['width'] >= 648
                    assert abs(page.locator('.prose').evaluate('e=>Number.parseFloat(getComputedStyle(e).lineHeight)/Number.parseFloat(getComputedStyle(e).fontSize)') - 1.85) < .001
                    assert page.locator('#article-hero').evaluate('e=>getComputedStyle(e).display') == 'none'
                    assert body['y'] < (460 if width <= 480 else 510), (width, body['y'])
                    if mode == 'light': dimensions.append({'viewport':[width,height],'bodyWidth':body['width'],'bodyTop':body['y'],'rightToc':width>=1440})
                    # Every optional section uses the same gap, without an empty hero row.
                    gap = page.locator('#reader').evaluate('e=>Number.parseFloat(getComputedStyle(e).rowGap)')
                    after_header = page.locator('.toc-inline' if width < 1440 else '.prose').bounding_box()
                    header = page.locator('.reader-header').bounding_box()
                    assert abs(after_header['y'] - header['y'] - header['height'] - gap) <= 1
                # Flat MD3 fallback must keep the same geometry and readable solid surfaces.
                before = page.locator('#main-content').bounding_box()
                page.evaluate("document.body.classList.remove('has-wallpaper');document.querySelector('.site-wallpaper').hidden=true")
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                assert page.locator('#main-content').bounding_box() == before
                page.evaluate("document.body.classList.add('has-wallpaper');document.querySelector('.site-wallpaper').hidden=false")
                if artifacts and (width, height) in VIEWPORTS:
                    page.screenshot(path=str(artifacts / f'{"article" if route else "home"}-{width}-{mode}.png'), animations='disabled')
    if artifacts: (artifacts/'layout-metrics.json').write_text(json.dumps(dimensions, indent=2))
    print('PASS P2.1 layouts: eight required viewports + 1119/1120/1439 boundaries, two themes/flat surfaces, stable reader width/first-screen content/section gaps, no overflow')


def surface_alpha(page, selector):
    page.locator(selector).evaluate('async e=>{getComputedStyle(e).backgroundColor;await Promise.allSettled(e.getAnimations().map(a=>a.finished))}')
    return page.locator(selector).evaluate('''e=>{const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.fillStyle=getComputedStyle(e).backgroundColor;ctx.fillRect(0,0,1,1);return ctx.getImageData(0,0,1,1).data[3]/255}''')


def contrast_checks(page, context, url, requests, artifacts):
    results = []
    for width, height in ((1440,900),(390,844)):
        page.set_viewport_size({'width':width,'height':height})
        for route in ('','posts/'+TECH+'/'):
            page.goto(url+route,wait_until='networkidle');ready(page)
            page.wait_for_function('document.body.classList.contains("has-wallpaper")')
            for mode in ('light','dark'):
                page.evaluate('m=>NekomiTheme.setMode(m)',mode)
                page.locator('body').evaluate('async e=>{getComputedStyle(e).color;await Promise.allSettled(e.getAnimations().map(a=>a.finished))}')
                ratios=page.evaluate('''()=>{
                  const ctx=document.createElement('canvas').getContext('2d');
                  function color(value){ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)}
                  function mix(f,b){return f.slice(0,3).map((v,i)=>v*f[3]+b[i]*(1-f[3]))}
                  function luminance(c){return c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)}
                  function contrast(a,b){const x=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (x[1]+.05)/(x[0]+.05)}
                  const style=getComputedStyle(document.body),surface=color('rgb('+style.getPropertyValue('--mdui-color-surface')+')');
                  const overlay=color(getComputedStyle(document.querySelector('.site-wallpaper'),'::after').backgroundColor)[3];
                  const samples=[],reader=document.querySelector('.reader');
                  for(const pixel of [[0,0,0],[255,255,255]]){
                    const wallpaper=mix([...surface.slice(0,3),overlay],pixel);
                    const sidebar=mix([...surface.slice(0,3),Number(style.getPropertyValue('--wallpaper-sidebar-veil'))],wallpaper);
                    function check(name,node,paint,base=wallpaper){if(!node)return;const bg=paint?mix(color(getComputedStyle(paint).backgroundColor),base):base;const fg=mix(color(getComputedStyle(node).color),bg);samples.push({name,pixel:pixel[0],ratio:contrast(fg,bg)})}
                    if(innerWidth>=1120){
                      for(const selector of ['.site-intro','.site-tagline','.sidebar-settings'])check(selector,document.querySelector(selector),null,sidebar);
                      const tab=document.querySelector('.sidebar mdui-tab[active]');
                      check('sidebar active tab',tab.shadowRoot.querySelector('[part="label"]'),tab.shadowRoot.querySelector('[part="container"]'),sidebar);
                      const item=[...document.querySelectorAll('.sidebar mdui-list-item')].find(e=>!e.active);
                      check('sidebar date',item.shadowRoot.querySelector('[part~="description"]'),null,sidebar);
                    }
                    if(reader){for(const selector of ['.prose','.prose a:not(.heading-anchor)','.reader-meta'])check(selector,document.querySelector(selector),reader);if(innerWidth>=1440)check('right TOC',document.querySelector('#toc-desktop-list mdui-list-item:not([active])').shadowRoot.querySelector('[part=headline]'));}
                    else {check('home description',document.querySelector('.view-description'));for(const selector of ['.post-meta','.post-excerpt','.post-title a']){const node=document.querySelector(selector);check(selector,node,node.closest('.post-card'));}}
                  }
                  return samples;
                }''')
                for sample in ratios:
                    assert sample['ratio'] >= 4.5, (width,mode,route,sample)
                results.append({'width':width,'mode':mode,'page':'reader' if route else 'home','minimumContrast':min(s['ratio'] for s in ratios)})
    if artifacts:(artifacts/'contrast-metrics.json').write_text(json.dumps(results,indent=2))
    print('PASS P2.1 surfaces: effective light/dark text contrast >=4.5 over black/white wallpapers, including sidebar/tab/metadata/body/links/right TOC and phone overlays')


def visual_fixture_checks(page, context, url, requests, artifacts):
    for width, height in VIEWPORTS:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(url, wait_until='networkidle'); ready(page)
        for mode in ('light','dark'):
            page.wait_for_function('document.body.classList.contains("has-wallpaper")')
            page.evaluate('m=>NekomiTheme.setMode(m)',mode)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            cover = page.locator('.post-card .post-cover').first
            page.wait_for_function('document.querySelector(".post-cover img")?.naturalWidth>0')
            assert cover.locator('img').get_attribute('src').endswith('.webp')
            assert cover.locator('img').get_attribute('srcset')
            assert cover.locator('img').get_attribute('width')
            image, copy = cover.bounding_box(), page.locator('.post-card .post-copy').first.bounding_box()
            if page.locator('.post-card').first.bounding_box()['width'] >= 640:
                assert image['x'] > copy['x'] + copy['width']
                assert abs(image['y']-copy['y']) < 1
            else:
                assert image['y']+image['height'] < copy['y']
            card_alpha = surface_alpha(page,'.post-card:nth-child(2)')
            assert .82 <= card_alpha < .96, (width,mode,card_alpha)
            if artifacts and width in (1440,1024,390,320):
                page.screenshot(path=str(artifacts/f'cover-home-{width}-{mode}.png'),animations='disabled')
            # Native cover links keep the shell and all surface configuration in place.
            page.evaluate('window.fixtureWallpaper=document.querySelector(".wallpaper-image")')
            cover.click(); page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
            assert page.evaluate('fixtureWallpaper===document.querySelector(".wallpaper-image")')
            assert page.evaluate('Number(document.body.style.getPropertyValue("--wallpaper-reader-opacity"))') == (.96 if mode=='light' else .98)
            assert surface_alpha(page,'.reader') > card_alpha
            hero = page.locator('.article-hero').bounding_box()
            header = page.locator('.reader-header').bounding_box()
            assert abs(hero['y']-header['y']-header['height']-(16 if width<=480 else 24)) <= 1
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.goto(url+'posts/md3-palette-for-blog/',wait_until='networkidle');ready(page)
            expect(page.locator('#article-tags mdui-chip')).to_have_count(6)
            assert page.locator('#article-title').evaluate('e=>e.scrollWidth<=e.clientWidth')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if width <= 480:
                assert page.locator('.prose').bounding_box()['y'] < height - 24, (width,page.locator('.prose').bounding_box())
            if artifacts and width in (1440,390,320):
                page.screenshot(path=str(artifacts/f'long-title-{width}-{mode}.png'),animations='disabled')
            page.goto(url,wait_until='networkidle');ready(page)
    page.set_viewport_size({'width':390,'height':844})
    article(page,url,'no-image-state')
    expect(page.locator('#article-tags')).to_have_count(0)
    expect(page.locator('.article-demo-note')).to_have_count(0)
    assert page.locator('#article-hero').evaluate('e=>getComputedStyle(e).display') == 'none'
    # An article without a TOC must not leave an empty section gap either.
    page.evaluate('document.querySelector(".toc-inline").remove();document.querySelector(".reading-toc").hidden=true')
    header=page.locator('.reader-header').bounding_box();body=page.locator('.prose').bounding_box()
    assert abs(body['y']-header['y']-header['height']-16) <= 1
    print('PASS P2.1 fixtures: eight viewports × two themes, actual built cover/hero/long-title/six-tag/no-tag states, matching section gaps, native cover SPA links and persistent reader opacity')


def image_fixture_checks(page, context, url, requests):
    page.set_viewport_size({'width':390,'height':844})
    article(page,url)
    expect(page.locator('.prose img')).to_have_count(2)
    for image in page.locator('.prose img').all():
        image.scroll_into_view_if_needed()
        expect(image).to_have_attribute('srcset',re.compile('640w'))
        assert image.get_attribute('width') and image.get_attribute('height')
    for depth in ('5','6'):
        expect(page.locator('#toc-desktop-list mdui-list-item[data-depth="'+depth+'"]').first).to_have_count(1)
    page.evaluate('scrollTo(0,0)')
    page.locator('#toc-toggle').click()
    expect(page.locator('#toc-inline-list mdui-list-item[data-depth="6"]')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    # Fail the generated asset itself, rather than bypassing Image: retain the
    # existing avatar/text/cover/hero fallbacks with responsive srcset enabled.
    context.route('**/_astro/demo-home*.webp',lambda r:r.fulfill(status=404,body=b'missing image'))
    page.reload(wait_until='networkidle');ready(page)
    expect(page.locator('.article-hero')).to_have_count(0)
    expect(page.locator('[data-avatar]')).to_have_count(0)
    expect(page.locator('.sidebar .site-avatar')).to_contain_text('林')
    for _ in range(2):
        page.locator('.prose img').first.scroll_into_view_if_needed()
        expect(page.locator('.image-fallback')).to_have_count(_+1)
    page.goto(url,wait_until='networkidle');ready(page)
    expect(page.locator('.post-cover')).to_have_count(0)
    print('PASS P2.2 image fixtures: relative Markdown + existing HTML figure optimized with dimensions/srcset, actual H5/H6 long TOC labels, generated asset failures retain avatar/cover/hero/body fallbacks')


def fixture_checks(page, context, url, requests):
    ready(page)
    expect(page.locator('img[src*="missing-fixture-avatar"]')).to_have_count(0)
    page.wait_for_function('document.querySelector(".sidebar .site-avatar img")?.naturalWidth>0')
    assert page.locator('.sidebar .site-avatar img').get_attribute('width') == '144'
    page.locator('#side-desktop-friends').click()
    expect(page.locator('.sidebar .friend-list mdui-list-item')).to_have_count(5)
    page.wait_for_function('document.querySelector(".sidebar .friend-avatar img")?.naturalWidth>0')
    assert page.locator('.sidebar .friend-avatar img').get_attribute('src').endswith('.webp')
    assert page.locator('.sidebar .friend-avatar img').get_attribute('width') == '72'
    assert page.locator('.sidebar .friend-avatar img').get_attribute('srcset')
    page.locator('.sidebar [data-friends-all]').click()
    expect(page.locator('#friends-dialog')).to_be_visible()
    expect(page.locator('#friends-dialog mdui-list-item')).to_have_count(7)
    page.keyboard.press('Escape')
    expect(page.locator('.sidebar [data-friends-all] button')).to_be_focused()
    page.locator('#side-desktop-comments').click()
    expect(page.locator('.sidebar .comment-list mdui-list-item')).to_have_count(4)
    for item in page.locator('.sidebar .comment-list mdui-list-item').all():
        assert '#' not in item.get_attribute('href')
    expect(page.locator('.sidebar .comments-note')).to_contain_text('点击阅读留言对应的文章')
    for width, height in ((390, 844), (390, 600), (320, 568)):
        page.set_viewport_size({'width': width, 'height': height})
        assert page.locator('mdui-top-app-bar-title > .appbar-brand .brand-avatar img').bounding_box()['width'] == 30
        assert page.locator('mdui-top-app-bar-title > .appbar-brand .brand-avatar img').bounding_box()['height'] == 30
        page.locator('#menu-button').click()
        page.locator('#side-mobile-comments').click()
        expect(page.locator('#side-mobile-comments')).to_be_in_viewport(ratio=1)
        assert page.locator('[data-sidebar=mobile] .sidebar-tabs').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
        assert page.locator('.drawer-content').evaluate('e=>getComputedStyle(e).overflowY') == 'visible'
        page.locator('#side-mobile-friends').click()
        page.locator('[data-sidebar=mobile] [data-friends-all]').click()
        expect(page.locator('#mobile-drawer')).to_be_hidden()
        expect(page.locator('#friends-dialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#menu-button button')).to_be_focused()
    print('PASS sidebar fixtures: SSR friends/comments, complete dialog, no fake hashes, native modal focus, 320px and short-screen tabs without nested scroll')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--chromium', default=shutil.which('chromium'))
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--base', default='/')
    parser.add_argument('--verified-cdn', action='store_true')
    parser.add_argument('--cdn-cache', type=Path)
    parser.add_argument('--artifacts', type=Path)
    parser.add_argument('--only')
    parser.add_argument('--skip-fixtures', action='store_true')
    args = parser.parse_args()
    assert (args.dist / 'index.html').exists(), 'Run npm run build first'
    assert len(list((args.dist / 'posts').glob('*/index.html'))) == 10
    assert not (args.dist / 'server').exists(), 'Production must be static'
    if args.artifacts:
        args.artifacts.mkdir(parents=True, exist_ok=True)
    # Astro moves build assets with rename(); keep fixture output on the project filesystem.
    with tempfile.TemporaryDirectory(prefix='browser-', dir=ROOT / '.astro') as temp, sync_playwright() as p:
        temp = Path(temp)
        cache = args.cdn_cache or temp / 'cdn'
        cache.mkdir(parents=True, exist_ok=True)
        def cdn(route):
            resource = route.request.url
            key = cache / hashlib.sha256(resource.encode()).hexdigest()
            metadata = key.with_suffix('.type')
            if not key.exists() or not metadata.exists():
                result = subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', '--compressed', '--max-time', '45', '--user-agent', route.request.headers.get('user-agent', ''), '--output', str(key), '--write-out', '%{content_type}', resource], check=True, capture_output=True, text=True)
                metadata.write_text(result.stdout)
            route.fulfill(body=key.read_bytes(), headers={'content-type': metadata.read_text(), 'access-control-allow-origin': '*'})
        proxy_url = os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
        proxy = {'server': proxy_url, 'bypass': '127.0.0.1,localhost'} if proxy_url else None
        browser = p.chromium.launch(executable_path=args.chromium, args=['--no-sandbox'], proxy=proxy)
        def new_page(url, mobile=False, workers='block', failed_image=False, storage_denied=False, delayed_image=None):
            context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 900}, service_workers=workers, reduced_motion='no-preference', **({'is_mobile': True, 'has_touch': True} if mobile else {}))
            context.set_default_navigation_timeout(90000)
            if args.verified_cdn:
                context.route('https://**/*', cdn)
            # Only deterministic artwork in the regression suite. Delivery screenshots use the actual reviewed API image.
            context.route('https://www.nekopara.uk/pic_api', lambda r: delayed_image.append(r) if delayed_image is not None else r.fulfill(status=503 if failed_image else 200, body=b'failed image' if failed_image else (ROOT / 'src/assets/images/demo-home.png').read_bytes(), content_type='text/plain' if failed_image else 'image/png'))
            context.add_init_script('window.wallpaperDecodes=0;const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){if(this.classList.contains("wallpaper-image"))wallpaperDecodes++;return decode.call(this)}')
            if storage_denied:
                context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}})")
            errors, requests = [], []
            context.on('request', lambda r: requests.append({'type': r.resource_type, 'url': r.url}))
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('requestfailed', lambda r: errors.append(r.url) if r.failure != 'net::ERR_ABORTED' else None)
            page.goto(url, wait_until='domcontentloaded' if delayed_image is not None else 'networkidle')
            ready(page)
            return context, page, errors, requests
        server, url = start_server(args.dist, args.base)
        try:
            cases = [('persistence', persistence_checks), ('home', home_checks), ('content', content_checks), ('reader', reader_checks), ('engineering', engineering_checks), ('motion', motion_checks), ('copy', copy_checks), ('mobile', mobile_checks), ('cache', cache_checks), ('layouts', lambda pg,c,u,r:layout_checks(pg,c,u,r,args.artifacts)), ('surfaces',lambda pg,c,u,r:contrast_checks(pg,c,u,r,args.artifacts))]
            if args.only:
                cases = [case for case in cases if case[0] == args.only]
                assert cases or args.only in ('pending', 'fixtures', 'covers'), 'Unknown case'
            for name, check in cases:
                context, page, errors, requests = new_page(url, mobile=name == 'mobile', workers='allow' if name == 'cache' else 'block')
                try:
                    check(page, context, url, requests)
                    assert not errors, errors
                except Exception:
                    if args.artifacts:
                        page.screenshot(path=str(args.artifacts / ('failure-' + name + '.png')))
                    raise
                finally:
                    context.close()
            if not args.only or args.only == 'pending':
                pending = []
                context, page, errors, requests = new_page(url, delayed_image=pending)
                page.wait_for_function('document.querySelector(".site-wallpaper").hidden')
                page.evaluate('window.pendingLayer = document.querySelector(".site-wallpaper")')
                page.locator('#post-list .post-title a').first.click()
                page.wait_for_url(url + 'posts/' + TECH + '/')
                ready(page)
                # Worker registration can time out before the fallback image request begins.
                # Wait for the actual request while deliberately withholding its response.
                if not pending:
                    context.wait_for_event('request', predicate=lambda r:r.url == 'https://www.nekopara.uk/pic_api')
                page.wait_for_timeout(100)
                assert len(pending) == 1, ('pending API requests', len(pending), requests)
                pending[0].fulfill(body=(ROOT / 'src/assets/images/demo-home.png').read_bytes(), content_type='image/png')
                page.wait_for_function('document.querySelector(".wallpaper-image")?.naturalWidth > 0')
                assert page.evaluate('pendingLayer === document.querySelector(".site-wallpaper") && wallpaperDecodes === 1')
                assert len([r for r in requests if r['type'] == 'document']) == 1
                assert not errors, errors
                context.close()
                print('PASS pending background: navigation before image load retains the original loader/layer and finishes one decode on the destination')
                for failure in ('image', 'storage'):
                    context, page, errors, requests = new_page(url, failed_image=failure=='image', storage_denied=failure=='storage')
                    if failure == 'image':
                        expect(page.locator('.site-wallpaper')).to_be_hidden()
                        assert page.locator('body').evaluate('e=>!e.classList.contains("has-wallpaper")')
                    else:
                        page.evaluate("NekomiTheme.setMode('dark')")
                        page.locator('#post-list .post-title a').first.click()
                        page.wait_for_url(url + 'posts/' + TECH + '/')
                        ready(page)
                        assert page.evaluate("NekomiTheme.getMode() === 'dark'")
                    assert not errors, errors
                    context.close()
                print('PASS failures: image failure restores MD3 background; storage-denied theme survives client navigation')
                # Already-built HTML contains the entire article even when JavaScript is disabled.
                context = browser.new_context(java_script_enabled=False)
                if args.verified_cdn: context.route('https://**/*', cdn)
                page = context.new_page()
                page.goto(url + 'posts/' + TECH + '/')
                expect(page.locator('#article-body')).to_contain_text('Grid 项目的默认最小尺寸')
                expect(page.locator('.code-block')).to_have_count(2)
                context.close()
                print('PASS static output: served by Python only, Markdown body/metadata/code/TOC are present without JavaScript')
            if not args.skip_fixtures and (not args.only or args.only in ('fixtures', 'covers')):
                fixture = json.loads((ROOT / 'site.config.json').read_text())
                fixture.update(json.loads((ROOT / 'tests/fixtures/sidebar.json').read_text()))
                fixture['site']['avatar'] = 'images/demo-home.png'
                fixture['friends'][0]['avatar'] = 'images/missing-fixture-avatar.png'
                fixture['friends'][1]['avatar'] = 'images/demo-home.png'
                fixture['appearance']['wallpaper'].update(lightReaderSurface=.96, darkReaderSurface=.98)
                posts_dir = temp/'posts'; shutil.copytree(ROOT/'src/content/posts', posts_dir)
                for post_id, changes in json.loads((ROOT/'tests/fixtures/visual.json').read_text()).items():
                    post_file=posts_dir/(post_id+'.md'); raw=post_file.read_text(); _,front,body=raw.split('---\n',2); meta=json.loads(front);meta.update(changes);post_file.write_text('---\n'+json.dumps(meta,ensure_ascii=False)+'\n---\n'+body)
                # Only this temporary Collection copy adds image / deep-heading
                # cases; authored bodies and metadata in src/content stay intact.
                probe = posts_dir / (TECH + '.md')
                relative_image = os.path.relpath(ROOT/'src/assets/images/demo-home.png', posts_dir)
                probe.write_text(probe.read_text() + '\n##### 五级标题回归 {#fixture-h5}\n\n###### 六级长标题回归：' + 'unbrokenheading'.join(['目录']*12) + ' {#fixture-h6}\n\n![相对路径图片回归](' + relative_image + ')\n')
                config = temp / 'site.json'; config.write_text(json.dumps(fixture, ensure_ascii=False))
                fixture_dist = temp / 'fixture-dist'
                env = {**os.environ, 'ASTRO_TELEMETRY_DISABLED':'1', 'NEKOMI_CONFIG':str(config), 'ASTRO_OUT_DIR':str(fixture_dist), 'ASTRO_CACHE_DIR':str(temp/'cache'), 'SITE_BASE':args.base, 'NEKOMI_CONTENT_DIR':str(posts_dir)}
                build = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, env=env, capture_output=True, text=True)
                assert build.returncode == 0, build.stdout + build.stderr
                assert 'contains multiple entries with the same slug' not in build.stdout, build.stdout
                fixture_server, fixture_url = start_server(fixture_dist, args.base)
                context, page, errors, requests = new_page(fixture_url)
                try:
                    if args.only != 'covers':
                        fixture_checks(page, context, fixture_url, requests)
                        visual_fixture_checks(page, context, fixture_url, requests, args.artifacts)
                    shared_cover_checks(page, context, fixture_url, requests)
                    if args.only != 'covers': image_fixture_checks(page, context, fixture_url, requests)
                    assert not errors, errors
                finally:
                    context.close();fixture_server.shutdown();fixture_server.server_close()
            browser.close()
        finally:
            server.shutdown();server.server_close()


if __name__ == '__main__':
    main()
