"""P0/P1 browser regression checks against the pinned MDUI 2.1.5 runtime.

Requires Python Playwright and Chromium. See tests/README.md.
"""
import argparse
import functools
import hashlib
import http.server
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TECH = 'css-grid-two-column-blog'
ESSAY = 'weekend-walk-by-river'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def value(page, expression, expected):
    page.wait_for_function(f"(expected) => ({expression}) === expected", arg=expected)


def ready(page):
    expect(page.locator('main')).to_have_attribute('aria-busy', 'false')


def article(page, url, post=TECH, fragment=''):
    page.goto(url + f'article.html?post={post}{fragment}', wait_until='networkidle')
    ready(page)
    expect(page.locator('#reader')).to_be_visible()
    expect(page.locator('#article-error')).to_be_hidden()


def selected(page, name):
    value(page, "document.querySelector('#content-tabs').value", name)
    expect(page.locator(f'#panel-{name}')).to_be_visible()
    expect(page.locator('mdui-tab-panel:visible')).to_have_count(1)
    expect(page.locator('mdui-tab[aria-selected=true]')).to_have_attribute('value', name)
    expect(page.locator('mdui-tab[tabindex="0"]')).to_have_count(1)


def themes(page, context, url, trigger):
    page.evaluate("NekomiTheme.setMode('light')")
    expect(page.locator('mdui-dropdown, mdui-menu')).to_have_count(0)
    for mode in ('dark', 'auto', 'light', 'dark'):
        trigger.click()
        value(page, 'NekomiTheme.getMode()', mode)
        for label in page.locator('[data-theme-label]').all():
            expect(label).to_contain_text({'light': '浅色', 'dark': '深色', 'auto': '跟随系统'}[mode])
    page.reload(wait_until='networkidle')
    value(page, 'NekomiTheme.getMode()', 'dark')
    value(page, 'getComputedStyle(document.documentElement).colorScheme', 'dark')
    page.evaluate("NekomiTheme.setMode('auto')")
    for mode in ('dark', 'light'):
        page.emulate_media(color_scheme=mode)
        value(page, 'getComputedStyle(document.documentElement).colorScheme', mode)
    other = context.new_page()
    other.goto(url, wait_until='networkidle')
    other.evaluate("localStorage.setItem('nekomi-theme', 'dark')")
    value(page, 'NekomiTheme.getMode()', 'dark')
    other.evaluate("localStorage.removeItem('nekomi-theme')")
    value(page, 'NekomiTheme.getMode()', 'auto')
    other.close()
    # Keyboard activates the real MDUI icon button.
    trigger.locator('button').focus()
    page.keyboard.press('Enter')
    value(page, 'NekomiTheme.getMode()', 'light')


def home_checks(page, context, url):
    ready(page)
    expect(page.locator('#post-list .post-card')).to_have_count(10)
    expect(page.get_by_role('tablist', name='博客内容')).to_have_count(1)
    for name in ('categories', 'tags', 'archive', 'recent'):
        page.locator(f'#tab-{name}').click()
        selected(page, name)
    page.locator('#tab-recent').focus()
    for key, name in (('ArrowRight', 'categories'), ('End', 'archive'), ('Home', 'recent'), ('ArrowLeft', 'archive')):
        page.keyboard.press(key)
        selected(page, name)
        expect(page.locator(f'#tab-{name}')).to_be_focused()
    page.locator('#tab-categories').click()
    page.locator('#tab-archive').click()
    page.go_back()
    selected(page, 'categories')
    page.go_forward()
    selected(page, 'archive')
    page.goto(url + '#tags', wait_until='networkidle')
    selected(page, 'tags')
    page.locator('#tags-list [data-query]').first.click()
    selected(page, 'recent')
    expect(page.locator('#search-toolbar')).to_be_visible()
    page.locator('#search-chip [part=delete-icon]').click()
    expect(page.locator('.post-card')).to_have_count(10)
    page.keyboard.press('/')
    field = page.locator('[data-sidebar=desktop] [data-search] input')
    expect(field).to_be_focused()
    field.fill('CSS')
    expect(page.locator('.post-card')).to_have_count(2)
    assert 'q=CSS' in page.url
    page.reload(wait_until='networkidle')
    expect(page.locator('.post-card')).to_have_count(2)
    page.locator('[data-sidebar=desktop] [data-search] input').focus()
    page.keyboard.press('Escape')
    expect(page.locator('.post-card')).to_have_count(10)
    page.locator('[data-sidebar=desktop] [data-search] input').fill('not-found-123')
    page.keyboard.press('Enter')
    expect(page.locator('#feed-title')).to_be_focused()
    expect(page.locator('#search-empty')).to_be_visible()
    page.locator('[data-clear-search]').first.click()
    for link in page.locator('#post-list .post-title a, #post-list .post-footer mdui-button, .sidebar [data-post]').all():
        assert link.get_attribute('href').startswith('article.html?post=')
    expect(page.locator('#post-dialog')).to_have_count(0)
    # Native button navigation replaces the old excerpt Dialog.
    page.locator('#post-list .post-footer mdui-button').first.click()
    expect(page).to_have_url(url + 'article.html?post=' + TECH)
    ready(page)
    expect(page.locator('#article-title')).to_have_text('用 CSS Grid 搭一个稳定的两栏博客布局')
    page.locator('.reader-breadcrumb mdui-button').click()
    selected(page, 'recent')
    page.locator('#tab-categories').click()
    page.locator('#categories-list mdui-list-item').first.click()
    ready(page)
    expect(page.locator('#reader')).to_be_visible()
    page.go_back(wait_until='networkidle')
    selected(page, 'categories')
    page.locator('#tab-archive').click()
    page.locator('#archive-list mdui-list-item').last.click()
    expect(page.locator('#article-title')).to_have_text('静态博客的目录结构：先够用，再生长')
    page.locator('#article-tags mdui-chip').first.click()
    selected(page, 'recent')
    expect(page.locator('#search-toolbar')).to_be_visible()
    page.goto(url + '#preview/' + TECH, wait_until='networkidle')
    expect(page).to_have_url(url + 'article.html?post=' + TECH)
    page.goto(url, wait_until='networkidle')
    themes(page, context, url, page.locator('.sidebar-settings [data-theme-cycle]'))
    print('PASS P0: tabs/keyboard/history, search/filter URLs, all article entry types, theme cycle/system/storage')


def anchor_checks(page, url):
    article(page, url)
    expect(page.locator('#toc-desktop-list .toc-list a')).to_have_count(8)
    expect(page.locator('#toc-desktop-list ol ol ol')).to_have_count(1)
    first = page.locator('#toc-desktop-list a[href="#grid-minimum"]')
    first.click()
    expect(page.locator('#grid-minimum')).to_be_focused()
    expect(first).to_have_attribute('aria-current', 'location')
    page.locator('#toc-desktop-list a[href="#state"]').click()
    expect(page.locator('#state')).to_be_focused()
    expect(page.locator('#toc-desktop-list a[href="#state"]')).to_have_attribute('aria-current', 'location')
    page.go_back()
    expect(page).to_have_url(url + 'article.html?post=' + TECH + '#grid-minimum')
    expect(page.locator('#grid-minimum')).to_be_focused()
    page.go_forward()
    expect(page.locator('#state')).to_be_focused()
    page.reload(wait_until='networkidle')
    expect(page.locator('#state')).to_be_focused()
    page.wait_for_function('document.querySelector("#state").getBoundingClientRect().top >= 0')
    page.locator('#keyboard .heading-anchor').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#keyboard')).to_be_focused()
    assert page.url.endswith('#keyboard')
    page.evaluate('scrollTo(0, document.documentElement.scrollHeight)')
    expect(page.locator('#toc-desktop-list a[href="#finish"]')).to_have_attribute('aria-current', 'location')
    page.locator('[data-direction=next]').click()
    expect(page.locator('#article-title')).to_have_text('把 MD3 色板用在博客里，而不是做成控制台')
    page.locator('[data-direction=previous]').click()
    expect(page.locator('#article-title')).to_have_text('用 CSS Grid 搭一个稳定的两栏博客布局')
    page.go_back(wait_until='networkidle')
    expect(page.locator('#reader')).to_be_visible()
    print('PASS reader navigation: nested TOC, current section, anchor focus, reload/back/forward, adjacent posts')


def content_checks(page, context, url):
    article(page, url)
    context.grant_permissions(['clipboard-read', 'clipboard-write'])
    code = page.locator('.code-block pre code').first.text_content()
    page.locator('.copy-code').first.click()
    expect(page.locator('#site-feedback')).to_contain_text('代码已复制')
    assert page.evaluate('navigator.clipboard.readText()') == code
    expect(page.locator('.code-header span').first).to_have_text('CSS')
    expect(page.locator('pre[tabindex="0"]')).to_have_count(2)
    image = page.locator('.prose img').first
    box = image.bounding_box()
    assert abs(box['height'] / box['width'] - 900 / 1440) < .01
    image.scroll_into_view_if_needed()
    page.wait_for_function('document.querySelector(".prose img").naturalWidth > 0')
    expect(page.locator('.prose table caption')).to_contain_text('布局决策示例')
    expect(page.locator('#article-hero figure')).to_have_count(0)
    for width in (390, 320):
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.locator('.table-scroll').evaluate('e => e.scrollWidth > e.clientWidth')
        assert page.locator('pre').last.evaluate('e => e.scrollWidth > e.clientWidth')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('pre').last.focus()
        page.keyboard.press('End')
        page.keyboard.press('ArrowRight')
        page.wait_for_function('document.querySelectorAll("pre")[1].scrollLeft > 0')
    # All original P0 metadata entries have independently loadable content.
    ids = page.evaluate('NekomiData.posts.map(p => p.id)')
    for post in ids:
        article(page, url, post)
        expect(page.locator('.prose h2')).not_to_have_count(0)
        assert len(page.locator('.prose').text_content()) > 300
    print('PASS content: 10 independent bodies, exact code clipboard, valid image, local overflow, no-head-image state')


def mobile_checks(page, context, url):
    def open_drawer():
        page.locator('#menu-button').click()
        expect(page.locator('#menu-button button')).to_have_attribute('aria-expanded', 'true')
        expect(page.locator('#drawer-close button')).to_be_focused()

    def closed():
        expect(page.locator('#mobile-drawer')).to_be_hidden()
        expect(page.locator('#menu-button')).to_have_attribute('aria-expanded', 'false')

    expect(page.locator('mdui-top-app-bar')).to_be_visible()
    open_drawer()
    position = page.evaluate('scrollY')
    page.mouse.move(385, 700)
    page.mouse.wheel(0, 500)
    page.wait_for_timeout(100)
    assert page.evaluate('scrollY') == position
    for key in ('Tab', 'Shift+Tab'):
        for _ in range(12):
            page.keyboard.press(key)
            page.wait_for_function('document.querySelector("#mobile-drawer").contains(document.activeElement)')
    page.keyboard.press('Escape')
    closed()
    expect(page.locator('#menu-button button')).to_be_focused()
    open_drawer()
    page.locator('#drawer-close').click()
    closed()
    open_drawer()
    page.locator('#mobile-drawer [part=overlay]').click(position={'x': 380, 'y': 500})
    closed()
    page.locator('#tab-recent').focus()
    page.keyboard.press('/')
    field = page.locator('[data-sidebar=mobile] [data-search] input')
    expect(field).to_be_focused()
    field.fill('CSS')
    page.keyboard.press('Enter')
    closed()
    expect(page.locator('#post-list .post-title a').first).to_be_focused()
    page.locator('#post-list .post-title a').first.press('Enter')
    ready(page)
    expect(page.locator('#reader')).to_be_visible()
    page.locator('.skip-link').focus()
    page.keyboard.press('Enter')
    expect(page.locator('main')).to_be_focused()
    page.wait_for_function('document.querySelector("main").getBoundingClientRect().top >= 64')
    page.locator('#toc-toggle button').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#toc-toggle button')).to_have_attribute('aria-expanded', 'true')
    page.locator('#toc-inline-list a[href="#nested-layout"]').click()
    expect(page.locator('#nested-layout')).to_be_focused()
    expect(page.locator('#toc-inline-list a[href="#nested-layout"]')).to_have_attribute('aria-current', 'location')
    page.wait_for_function('document.querySelector("#nested-layout").getBoundingClientRect().top >= 64')
    page.reload(wait_until='networkidle')
    expect(page.locator('#nested-layout')).to_be_focused()
    page.keyboard.press('/')
    expect(field).to_be_focused()
    field.fill('排版')
    page.keyboard.press('Enter')
    selected(page, 'recent')
    expect(page.locator('#search-toolbar')).to_be_visible()
    open_drawer()
    page.locator('[data-sidebar=mobile] [data-post]').first.click()
    ready(page)
    expect(page.locator('#reader')).to_be_visible()
    open_drawer()
    page.set_viewport_size({'width': 1024, 'height': 768})
    closed()
    value(page, 'getComputedStyle(document.body).paddingTop', '0px')
    page.set_viewport_size({'width': 390, 'height': 844})
    value(page, 'document.querySelector("[data-site-appbar]").getBoundingClientRect().height', 64)
    themes(page, context, url, page.locator('.site-appbar [data-theme-cycle]'))
    print('PASS mobile: native App Bar/Drawer, scroll/focus/close paths, keyboard TOC, article search, resize, theme')


def fallback_checks(page, context, url):
    for post in ('', 'missing-post', '%3Cscript%3Ealert(1)%3C/script%3E'):
        page.goto(url + 'article.html?post=' + post, wait_until='networkidle')
        ready(page)
        expect(page.locator('#article-error')).to_have_attribute('data-kind', 'not-found')
        for selector in ('#reader', '#reading-toc', '#article-retry'):
            expect(page.locator(selector)).to_be_hidden()
        expect(page.locator('#article-error script')).to_have_count(0)
    page.locator('#article-error mdui-button').first.click()
    selected(page, 'recent')
    context.route('**/content/posts/' + TECH + '.html', lambda r: r.fulfill(status=503, body='unavailable'))
    page.goto(url + 'article.html?post=' + TECH, wait_until='networkidle')
    expect(page.locator('#article-error')).to_have_attribute('data-kind', 'unavailable')
    context.unroute('**/content/posts/' + TECH + '.html')
    page.locator('#article-retry').click()
    expect(page.locator('#reader')).to_be_visible()
    fixture = (ROOT / 'assets/js/data.js').read_text() + """
        NekomiData.site.avatar = 'assets/missing-avatar.png';
        NekomiData.posts[0].cover = 'assets/missing-cover.png';
        NekomiData.friends = [
            {name: '<script>unsafe</script>', url: 'javascript:alert(1)'},
            {name: '友邻', url: 'https://example.com/', avatar: 'assets/missing-friend.png', description: '测试友链'}
        ];
    """
    context.route('**/assets/js/data.js', lambda r: r.fulfill(body=fixture, content_type='text/javascript'))
    content = '<p>测试图片回退。</p><h2 id="sample">测试章节</h2><figure><img src="assets/missing-body.png" alt="正文示意图"><figcaption>图注保留</figcaption></figure>'
    context.route('**/content/posts/' + TECH + '.html', lambda r: r.fulfill(body=content, content_type='text/html'))
    article(page, url)
    expect(page.locator('.image-fallback')).to_have_text('图片暂时无法显示：正文示意图')
    expect(page.locator('#article-hero figure, .site-avatar img, .friend-avatar img')).to_have_count(0)
    expect(page.locator('.sidebar mdui-list-item[href="https://example.com/"]')).to_have_count(1)
    expect(page.locator('.sidebar mdui-list-item[href^="javascript:"]')).to_have_count(0)
    page.goto(url, wait_until='networkidle')
    expect(page.locator('.post-cover')).to_have_count(0)
    print('PASS failure states: invalid IDs, fetch/retry, body/hero/avatar/cover failures, safe friend links')


def media_checks(page, context, url):
    fixture = (ROOT / 'assets/js/data.js').read_text() + """
        NekomiData.posts[0].cover = 'screenshots/desktop-light-1440x900.png';
        NekomiData.posts[0].coverAlt = '本站首页布局样本';
        NekomiData.posts[1].cover = 'screenshots/mobile-dark-390x844.png';
    """
    context.route('**/assets/js/data.js', lambda r: r.fulfill(body=fixture, content_type='text/javascript'))
    page.reload(wait_until='networkidle')
    expect(page.locator('.post-cover')).to_have_count(2)
    for width, expected in ((1440, 'row'), (1024, 'row'), (861, 'column'), (390, 'column')):
        page.set_viewport_size({'width': width, 'height': 900})
        positions = page.locator('.post-main').first.evaluate('''e => {
            const a = e.querySelector('.post-copy').getBoundingClientRect();
            const b = e.querySelector('.post-cover').getBoundingClientRect();
            return {row: b.x >= a.right - 1, column: b.bottom <= a.y + 1};
        }''')
        assert positions[expected], positions
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('.post-cover').first.focus()
    page.keyboard.press('Enter')
    expect(page.locator('#article-hero img')).to_have_attribute('alt', '本站首页布局样本')
    page.wait_for_function('document.querySelector("#article-hero img").naturalWidth > 0')
    for width in (1440, 390):
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    # Long unbroken titles/URLs and generated Unicode duplicate IDs need no author fixes.
    context.unroute('**/assets/js/data.js')
    context.route('**/assets/js/data.js', lambda r: r.fulfill(
        body=fixture + "\nNekomiData.posts[0].title = '非常长的中文标题与UnbrokenIdentifier'.repeat(12);",
        content_type='text/javascript'))
    sample = '<h2>自动目录：重复</h2><p>第一节。</p><h3>内部节</h3><p>内容。</p><h2>自动目录：重复</h2><p>' + 'https://example.com/' + 'long-path-' * 60 + '</p>'
    context.route('**/content/posts/' + TECH + '.html', lambda r: r.fulfill(body=sample, content_type='text/html'))
    article(page, url)
    ids = page.locator('.prose h2, .prose h3').evaluate_all('es => es.map(e => e.id)')
    assert len(ids) == len(set(ids)) == 3 and ids[-1] == ids[0] + '-2'
    page.locator('#toc-toggle').click()
    page.locator('#toc-inline-list a').last.click()
    expect(page.locator('.prose h2').last).to_be_focused()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    print('PASS optional media, extreme title/URL wrapping and automatic unique Unicode heading anchors')


def layout_checks(page, url, artifacts):
    for width, height in ((1440, 900), (1024, 768), (861, 768), (860, 768), (390, 844), (320, 700)):
        page.set_viewport_size({'width': width, 'height': height})
        for route in ('', 'article.html?post=' + TECH):
            page.goto(url + route, wait_until='networkidle')
            ready(page)
            for mode in ('light', 'dark'):
                page.evaluate('mode => NekomiTheme.setMode(mode)', mode)
                value(page, 'getComputedStyle(document.documentElement).colorScheme', mode)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if width > 860:
                    assert page.locator('.sidebar').evaluate('''e => {
                        const s = getComputedStyle(e);
                        return s.backgroundColor === 'rgba(0, 0, 0, 0)' && s.borderRadius === '0px' && s.borderTopWidth === '0px' && s.boxShadow === 'none';
                    }''')
                    expect(page.locator('.site-appbar')).to_be_hidden()
                else:
                    expect(page.locator('.site-appbar')).to_be_visible()
                    value(page, 'document.querySelector("[data-site-appbar]").getBoundingClientRect().height', 64)
                if route:
                    assert page.locator('#reader').evaluate('e => e.clientWidth <= 760')
                    if width >= 1360:
                        expect(page.locator('#reading-toc')).to_be_visible()
                        expect(page.locator('.toc-inline')).to_be_hidden()
                    else:
                        expect(page.locator('#reading-toc')).to_be_hidden()
                        expect(page.locator('.toc-inline')).to_be_visible()
                if artifacts:
                    name = 'article' if route else 'home'
                    page.screenshot(path=str(artifacts / f'{name}-{width}-{mode}.png'), animations='disabled')
    print('PASS layouts: home/reader at 6 widths × 2 themes; transparent sidebar, native App Bar spacing, bounded prose')


def motion_checks(page, url):
    article(page, url)
    value(page, 'document.querySelector("main").nekomiEntrance.effect.getTiming().easing', 'cubic-bezier(0.16, 1, 0.3, 1)')
    page.emulate_media(reduced_motion='reduce')
    page.reload(wait_until='networkidle')
    value(page, 'Boolean(document.querySelector("main").nekomiEntrance)', False)
    page.goto(url, wait_until='networkidle')
    page.locator('#tab-tags').click()
    value(page, 'Boolean(document.querySelector("#panel-tags").nekomiEntrance)', False)
    page.set_viewport_size({'width': 390, 'height': 844})
    article(page, url)
    page.locator('#toc-toggle').click()
    page.locator('#toc-inline-list a[href="#state"]').click()
    expect(page.locator('#state')).to_be_focused()
    expect(page.locator('#toc-inline-list a[href="#state"]')).to_have_attribute('aria-current', 'location')
    print('PASS transitions: nonlinear entrance; reduced-motion page/tab and native TOC behavior')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium", default=shutil.which("chromium"))
    parser.add_argument("--verified-cdn", action="store_true",
                        help="Fetch CDN responses with TLS-verifying curl for browser replay")
    parser.add_argument("--artifacts", type=Path,
                        help="Optional directory for viewport screenshots")
    args = parser.parse_args()
    if args.artifacts:
        args.artifacts.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/"
    with tempfile.TemporaryDirectory() as cache, sync_playwright() as p:
        def verified_cdn(route):
            # Preserve proxy/CA configuration and TLS verification. No altered app resources.
            resource = route.request.url
            key = Path(cache) / hashlib.sha256(resource.encode()).hexdigest()
            metadata = key.with_suffix(".type")
            if not key.exists():
                result = subprocess.run([
                    "curl", "--fail", "--location", "--silent", "--show-error",
                    "--compressed", "--max-time", "40", "--user-agent",
                    route.request.headers.get("user-agent", ""), "--output", str(key),
                    "--write-out", "%{content_type}", resource,
                ], check=True, capture_output=True, text=True)
                metadata.write_text(result.stdout)
            route.fulfill(body=key.read_bytes(), headers={
                "content-type": metadata.read_text(),
                "access-control-allow-origin": "*",
            })

        proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
        proxy = {"server": proxy_url, "bypass": "127.0.0.1,localhost"} if proxy_url else None
        browser = p.chromium.launch(executable_path=args.chromium,
                                    args=["--no-sandbox"], proxy=proxy)

        def new_page(**options):
            context = browser.new_context(**options)
            if args.verified_cdn:
                context.route("https://**/*", verified_cdn)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("requestfailed", lambda request: errors.append(request.url))
            page.goto(url, wait_until="networkidle")
            page.wait_for_function("!!customElements.get('mdui-tabs')")
            return context, page, errors

        cases = [
            ('desktop', {'width': 1440, 'height': 900}, home_checks),
            ('anchors', {'width': 1440, 'height': 900}, lambda p, c, u: anchor_checks(p, u)),
            ('content', {'width': 1440, 'height': 900}, content_checks),
            ('mobile', {'width': 390, 'height': 844}, mobile_checks),
            ('fallbacks', {'width': 1440, 'height': 900}, fallback_checks),
            ('media', {'width': 1440, 'height': 900}, media_checks),
            ('layouts', {'width': 1440, 'height': 900}, lambda p, c, u: layout_checks(p, u, args.artifacts)),
            ('motion', {'width': 1440, 'height': 900}, lambda p, c, u: motion_checks(p, u)),
        ]
        for name, viewport, check in cases:
            context, page, errors = new_page(viewport=viewport,
                **({'is_mobile': True, 'has_touch': True} if name == 'mobile' else {}))
            try:
                check(page, context, url)
                assert not errors, errors
            except Exception:
                if args.artifacts:
                    page.screenshot(path=str(args.artifacts / f'failure-{name}.png'))
                raise
            finally:
                context.close()
        # Storage denial should not break either page's theme control.
        context, page, errors = new_page(viewport={'width': 390, 'height': 844})
        context.add_init_script("Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('denied', 'SecurityError')}})")
        article(page, url)
        page.locator('.site-appbar [data-theme-cycle]').click()
        value(page, 'NekomiTheme.getMode()', 'light')
        assert not errors, errors
        context.close()
        print('PASS storage-denied theme fallback; no unexpected JavaScript/resource failures')
        browser.close()
    server.shutdown()
    server.server_close()


if __name__ == '__main__':
    main()
