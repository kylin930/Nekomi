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
from urllib.parse import urlsplit, unquote
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TECH = 'css-grid-two-column-blog'
ESSAY = 'weekend-walk-by-river'
BASELINE = json.loads((ROOT / 'tests/fixtures/content-baseline.json').read_text())


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
        theme: NekomiTheme, mdui, palette: document.querySelector('style[id^="mdui-custom-color-scheme"]') };
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
      saved.theme === NekomiTheme && saved.mdui === mdui && saved.palette === document.querySelector('style[id^="mdui-custom-color-scheme"]')''')
    assert page.evaluate('imageLoads === 0 && wallpaperDecodes === 1 && refades === 0')
    assert page.evaluate('transitions.length >= 11 && transitions.every(t=>t.enter==="nekomi-in" && !t.root.includes("fade"))')
    expect(page.locator('.sidebar .sidebar-tabs')).to_have_attribute('value', 'comments')
    assert page.evaluate("NekomiTheme.getMode() === 'dark'")
    assert len([r for r in requests if r['type'] == 'document']) == 1
    assert len([r for r in requests if r['url'].startswith('https://www.nekopara.uk/pic_api')]) == 1
    assert len([r for r in requests if r['url'] == 'https://unpkg.com/mdui@2.1.5/mdui.global.js']) == 1
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
        assert digest == original['textSha256'], ('lost or changed content', original['id'], digest)
        assert page.locator('.prose h2,.prose h3,.prose h4,.prose h5,.prose h6').evaluate_all('es=>es.map(e=>({id:e.id,text:e.firstChild.textContent,level:Number(e.tagName.slice(1))}))') == original['headings']
        for index, code in enumerate(original['code']):
            assert page.locator('.code-block code').nth(index).text_content().rstrip('\n') == code.rstrip('\n')
        expect(page.locator('#article-title')).to_have_text(original['metadata']['title'])
    article(page, url)
    code = page.locator('.code-block code').first.text_content()
    page.locator('.copy-code').first.click()
    expect(page.locator('#site-feedback')).to_contain_text('代码已复制')
    assert page.evaluate('navigator.clipboard.readText()') == code
    expect(page.locator('#toc-desktop-list ol ol ol')).to_have_count(1)
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
    print('PASS P1/content: all ten Markdown bodies match original text hashes, stable heading IDs/exact code, clipboard/images/tables/overflow, old URL compatibility and static 404')


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
    expect(page.locator('#keyboard')).to_be_focused()
    page.go_forward()
    expect(page.locator('#grid-minimum')).to_be_focused()
    page.reload(wait_until='networkidle')
    ready(page)
    expect(page.locator('#grid-minimum')).to_be_focused()
    page.set_viewport_size({'width': 390, 'height': 844})
    article(page, url)
    page.locator('#toc-toggle').click()
    expect(page.locator('#toc-toggle button')).to_have_attribute('aria-expanded', 'true')
    page.locator('#toc-inline-list a[href="#state"]').click()
    page.wait_for_function('NekomiMotion.isScrolling()')
    page.evaluate('dispatchEvent(new Event("touchstart"))')
    assert not page.evaluate('NekomiMotion.isScrolling()')
    page.locator('#toc-inline-list a[href="#state"]').click()
    settled(page)
    assert abs(page.locator('#state').bounding_box()['y'] - 84) <= 1
    page.emulate_media(reduced_motion='reduce')
    page.locator('#toc-inline-list a[href="#grid-minimum"]').click()
    assert not page.evaluate('NekomiMotion.isScrolling()')
    expect(page.locator('#grid-minimum')).to_be_focused()
    assert page.locator('.wallpaper-image').evaluate('e=>getComputedStyle(e).transitionDuration') == '0.001s'
    print('PASS reading: nested/current TOC, spring interruption/repeat/offset/bounds, hash/reload/history/focus, native mobile collapse, reduced motion')


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
    for width in (1440, 1024, 861, 860, 390, 320):
        for route in ('', 'posts/' + TECH + '/'):
            page.set_viewport_size({'width': width, 'height': 900 if width > 860 else 844})
            page.goto(url + route, wait_until='networkidle')
            ready(page)
            for mode in ('light', 'dark'):
                page.evaluate('mode=>NekomiTheme.setMode(mode)', mode)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                if width > 860:
                    expect(page.locator('.sidebar')).to_be_visible()
                    assert page.locator('.sidebar').evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgba(0, 0, 0, 0)'
                    if width == 1440:
                        assert page.locator('.sidebar').bounding_box()['width'] == 320
                    assert page.locator('.sidebar .site-avatar').evaluate('e=>getComputedStyle(e).borderRadius') == '50%'
                else:
                    expect(page.locator('.site-appbar')).to_be_visible()
                    assert page.locator('.site-layout').bounding_box()['y'] >= 64
                if route:
                    assert page.locator('#reader').bounding_box()['width'] <= 760
                    expect(page.locator('#reading-toc') if width >= 1360 else page.locator('.toc-inline')).to_be_visible()
                if artifacts and width in (1440, 390):
                    page.screenshot(path=str(artifacts / f'{"article" if route else "home"}-{width}-{mode}.png'), animations='disabled')
    print('PASS layouts: static home/reader at six widths × two themes, shared sidebar/round avatars/surfaces and no horizontal page overflow')


def fixture_checks(page, context, url, requests):
    ready(page)
    expect(page.locator('img[src*="missing-fixture-avatar"]')).to_have_count(0)
    expect(page.locator('.sidebar .site-avatar')).to_contain_text('林')
    page.locator('#side-desktop-friends').click()
    expect(page.locator('.sidebar .friend-list mdui-list-item')).to_have_count(5)
    page.wait_for_function('document.querySelector(".sidebar .friend-avatar img")?.naturalWidth>0')
    page.locator('.sidebar [data-friends-all]').click()
    expect(page.locator('#friends-dialog')).to_be_visible()
    expect(page.locator('#friends-dialog mdui-list-item')).to_have_count(7)
    page.keyboard.press('Escape')
    expect(page.locator('.sidebar [data-friends-all] button')).to_be_focused()
    page.locator('#side-desktop-comments').click()
    expect(page.locator('.sidebar .comment-list mdui-list-item')).to_have_count(4)
    for item in page.locator('.sidebar .comment-list mdui-list-item').all():
        assert '#' not in item.get_attribute('href')
    expect(page.locator('.sidebar .comments-note')).to_contain_text('评论定位暂未接入')
    for width, height in ((390, 844), (390, 600), (320, 568)):
        page.set_viewport_size({'width': width, 'height': height})
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
            context.route('https://www.nekopara.uk/pic_api', lambda r: delayed_image.append(r) if delayed_image is not None else r.fulfill(status=503 if failed_image else 200, body=b'failed image' if failed_image else (ROOT / 'public/images/demo-home.png').read_bytes(), content_type='text/plain' if failed_image else 'image/png'))
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
            cases = [('persistence', persistence_checks), ('home', home_checks), ('content', content_checks), ('reader', reader_checks), ('mobile', mobile_checks), ('cache', cache_checks), ('layouts', lambda pg,c,u,r:layout_checks(pg,c,u,r,args.artifacts))]
            if args.only:
                cases = [case for case in cases if case[0] == args.only]
                assert cases or args.only in ('pending', 'fixtures'), 'Unknown case'
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
                pending[0].fulfill(body=(ROOT / 'public/images/demo-home.png').read_bytes(), content_type='image/png')
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
            if not args.skip_fixtures and (not args.only or args.only == 'fixtures'):
                fixture = json.loads((ROOT / 'site.config.json').read_text())
                fixture.update(json.loads((ROOT / 'tests/fixtures/sidebar.json').read_text()))
                fixture['site']['avatar'] = 'images/missing-fixture-avatar.png'
                fixture['friends'][0]['avatar'] = 'images/missing-fixture-avatar.png'
                fixture['friends'][1]['avatar'] = 'images/demo-home.png'
                config = temp / 'site.json'; config.write_text(json.dumps(fixture, ensure_ascii=False))
                fixture_dist = temp / 'fixture-dist'
                env = {**os.environ, 'ASTRO_TELEMETRY_DISABLED':'1', 'NEKOMI_CONFIG':str(config), 'ASTRO_OUT_DIR':str(fixture_dist), 'SITE_BASE':args.base}
                subprocess.run(['npm', 'run', 'build'], cwd=ROOT, env=env, check=True, capture_output=True, text=True)
                fixture_server, fixture_url = start_server(fixture_dist, args.base)
                context, page, errors, requests = new_page(fixture_url)
                try:
                    fixture_checks(page, context, fixture_url, requests)
                    assert not errors, errors
                finally:
                    context.close();fixture_server.shutdown();fixture_server.server_close()
            browser.close()
        finally:
            server.shutdown();server.server_close()


if __name__ == '__main__':
    main()
