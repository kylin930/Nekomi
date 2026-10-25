"""Native FAB + persisted-shell/browser-history regression. Fixtures are never published."""
import argparse
import json
import shutil
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, expect
from browser_audit import ROOT, ready, start_server
from browse_audit import external_routes
from theme_audit import ARTIFACTS, build


def fixtures():
    folder = ARTIFACTS / 'fab-posts'
    folder.mkdir(parents=True, exist_ok=True)
    paragraph = '这是一段用于浏览器检查的临时内容。文章长度不应影响公共控件、键盘导航或阅读位置的恢复。'
    body = ('\n\n' + paragraph) * 8 + '\n\n![主题截图](images/demo-home.png)\n'
    for index in range(12):
        body += f'\n## 章节 {index + 1}\n' + ('\n\n' + paragraph) * 5
        body += '\n\n```js\nconsole.log("reading");\n```\n'
    for index in range(14):
        meta = {'title': f'返回顶部回归文章 {index:02d}', 'date': f'2026-01-{index + 1:02d}', 'category': '测试内容', 'tags': ['临时数据'], 'demo': True}
        (folder / f'entry-{index:02d}.md').write_text('---\n' + json.dumps(meta, ensure_ascii=False) + '\n---\n' + body)
    return folder


def enhanced(page):
    ready(page)
    page.wait_for_function('!document.querySelector("[data-back-to-top]").hidden')


def scroll(page, y):
    page.evaluate('(y) => scrollTo({top:y, behavior:"instant"})', y)


def visible(page):
    page.wait_for_function('document.querySelector("[data-back-to-top]").classList.contains("is-visible")')
    page.wait_for_function('getComputedStyle(document.querySelector("[data-back-to-top]")).opacity === "1"')


def hidden(page):
    expect(page.locator('[data-back-to-top]')).to_have_attribute('aria-hidden', 'true')
    assert page.locator('[data-back-to-top]').evaluate('node => node.inert')
    expect(page.locator('[data-back-to-top]')).to_be_hidden()


def follow(page, locator, page_type):
    target = urljoin(page.url, locator.get_attribute('href'))
    locator.click()
    page.wait_for_url(target)
    expect(page.locator('body')).to_have_attribute('data-page', page_type)
    enhanced(page)


def exercise(browser, dist, base, screenshots):
    server, url = start_server(dist, base)
    try:
        for mobile, mode in [(False, 'light'), (False, 'dark'), (True, 'light'), (True, 'dark')]:
            context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 900}, is_mobile=mobile, has_touch=mobile, service_workers='block')
            external_routes(context, '/tmp/nekomi-p11/cdn')
            context.route('https://images.example/wallpaper.png', lambda route: route.fulfill(body=(ROOT / 'src/assets/images/demo-home.png').read_bytes(), content_type='image/png'))
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url)
            enhanced(page)
            page.wait_for_selector('.wallpaper-image.is-visible')
            label = json.loads(page.locator('#site-data').text_content())['ui']['navigation']['backToTop']
            fab = page.get_by_role('button', name=label, exact=True)
            hidden(page)
            page.evaluate('(mode) => NekomiTheme.setMode(mode)', mode)
            page.evaluate('''() => {
              window.fabShell = {fab:document.querySelector("mdui-fab"), wall:document.querySelector(".wallpaper-image"), side:document.querySelector("[data-site-sidebar]"), time:performance.timeOrigin};
              window.topCalls = 0;
              const original = NekomiMotion.scrollTo;
              NekomiMotion.scrollTo = (...args) => { topCalls++; return original(...args); };
            }''')
            scroll(page, 400)
            hidden(page)
            scroll(page, 401)
            visible(page)
            expect(fab).to_have_attribute('aria-label', label)
            assert page.locator('mdui-fab').evaluate('node => node instanceof customElements.get("mdui-fab") && node.shadowRoot.querySelector("mdui-ripple") !== null')
            history = page.evaluate('history.length')
            fab.focus()
            page.keyboard.press('Enter')
            page.wait_for_function('scrollY === 0 && !NekomiMotion.isScrolling()')
            hidden(page)
            expect(page.locator('#main-content')).to_be_focused()
            assert page.evaluate('topCalls') == 1
            assert page.evaluate('history.length') == history

            # Actual appended batches must survive article visits and native history.
            scroll(page, 100000)
            page.wait_for_function('document.querySelectorAll(".post-card").length >= 12')
            link = page.locator('.post-title a').nth(8)
            link.scroll_into_view_if_needed()
            visible(page)
            y = page.evaluate('scrollY')
            count = page.locator('.post-card').count()
            target = urljoin(page.url, link.get_attribute('href'))
            follow(page, link, 'article')
            assert page.evaluate('scrollY') == 0
            hidden(page)
            page.go_back()
            expect(page.locator('body')).to_have_attribute('data-page', 'home')
            enhanced(page)
            page.wait_for_function('(y) => Math.abs(scrollY-y) <= 2', arg=y)
            assert page.locator('.post-card').count() == count
            visible(page)
            page.go_forward()
            page.wait_for_url(target)
            expect(page.locator('body')).to_have_attribute('data-page', 'article')
            enhanced(page)
            hidden(page)
            # Long-article scrolling is interruptible and does not compete with TOC.
            scroll(page, 3500)
            visible(page)
            fab.click()
            page.wait_for_timeout(50)
            page.mouse.wheel(0, 600)
            page.wait_for_function('!NekomiMotion.isScrolling()')
            assert page.evaluate('scrollY') > 400
            visible(page)
            before = page.evaluate('topCalls')
            fab.click()
            page.wait_for_function('scrollY === 0 && !NekomiMotion.isScrolling()')
            assert page.evaluate('topCalls') == before + 1
            hidden(page)

            if mobile:
                page.locator('#toc-toggle').click()
            page.locator('#toc-inline-list mdui-list-item' if mobile else '#toc-desktop-list mdui-list-item').last.click()
            page.wait_for_function('location.hash && !NekomiMotion.isScrolling()')
            visible(page)
            chapter = page.evaluate('[location.hash, history.length]')
            fab.click()
            page.wait_for_function('scrollY === 0 && !NekomiMotion.isScrolling()')
            assert page.evaluate('[location.hash, history.length]') == chapter
            hidden(page)

            # Native overlays and the real PhotoSwipe viewer take precedence.
            image = page.locator('#article-body img').first
            image.scroll_into_view_if_needed()
            visible(page)
            image.click()
            expect(page.locator('.nekomi-lightbox')).to_be_visible()
            hidden(page)
            expect(page.get_by_role('dialog', name='图片查看器')).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.locator('.nekomi-lightbox')).to_have_count(0)
            visible(page)
            page.evaluate('document.getElementById("site-feedback").open=true')
            hidden(page)
            page.evaluate('document.getElementById("site-feedback").open=false')
            visible(page)
            page.evaluate('document.getElementById("friends-dialog").open=true')
            hidden(page)
            page.locator('#friends-close').click()
            visible(page)
            if mobile:
                page.locator('#menu-button').click()
                hidden(page)
                page.locator('#drawer-close').click()
                visible(page)
                # Exercise real safe-area environment variables in Chromium.
                context.new_cdp_session(page).send('Emulation.setSafeAreaInsetsOverride', {'insets': {'bottom': 34, 'right': 10}})
                assert page.locator('[data-back-to-top]').evaluate('node => {const css=getComputedStyle(node);return parseFloat(css.bottom)===50 && parseFloat(css.right)===26}')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            if screenshots and base == '/' and ((not mobile and mode == 'light') or (mobile and mode == 'dark')):
                page.wait_for_timeout(400)
                page.screenshot(path=str(ARTIFACTS / ('fab-fixture-mobile-dark.png' if mobile else 'fab-fixture-desktop-light.png')))

            page.emulate_media(reduced_motion='reduce')
            assert page.locator('[data-back-to-top]').evaluate('node => getComputedStyle(node).transitionDuration === "0s"')
            scroll(page, 2500)
            visible(page)
            before = page.evaluate('topCalls')
            fab.click()
            assert page.evaluate('scrollY') == 0
            assert not page.evaluate('NekomiMotion.isScrolling()')
            assert page.evaluate('topCalls') == before + 1
            hidden(page)

            # Existing friends route and sidebar CTA, including the mobile Drawer.
            if mobile:
                page.locator('#menu-button').click()
            sidebar = page.locator(f'[data-sidebar={"mobile" if mobile else "desktop"}]')
            sidebar.locator('mdui-tab[value=friends]').click()
            all_friends = sidebar.locator('mdui-button[href$="friends/"]')
            expect(all_friends).to_have_attribute('href', base + 'friends/')
            follow(page, all_friends, 'page')
            expect(page.locator('.friends-page-list mdui-list-item')).to_have_count(6)
            expect(page.locator('#friends-dialog')).to_have_js_property('open', False)
            assert page.evaluate('fabShell.fab===document.querySelector("mdui-fab") && fabShell.wall===document.querySelector(".wallpaper-image") && fabShell.side===document.querySelector("[data-site-sidebar]") && fabShell.time===performance.timeOrigin')
            expect(page.locator('mdui-fab')).to_have_count(1)
            follow(page, page.locator('.friends-page > mdui-button'), 'home')
            scroll(page, 900)
            visible(page)
            before = page.evaluate('topCalls')
            fab.click()
            assert page.evaluate('scrollY') == 0
            assert page.evaluate('topCalls') == before + 1
            assert context.request.get(url + 'friends/').status == 200
            if not mobile and mode == 'light':
                page.wait_for_timeout(450)
                for width, height in [(960, 720), (320, 700), (1440, 500)]:
                    page.set_viewport_size({'width': width, 'height': height})
                    scroll(page, 900)
                    visible(page)
                    assert page.locator('mdui-fab').evaluate('node => {const r=node.getBoundingClientRect();return r.left>=15 && r.right<=innerWidth-15 && r.top>=0 && r.bottom<=innerHeight-15}')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert not errors, errors
            context.close()
            print('PASS FAB:', base, 'mobile' if mobile else 'desktop', mode, 'history/batches, focus, overlays, reduced motion, friends and shell persistence', flush=True)
    finally:
        server.shutdown()
        server.server_close()


def disabled(browser, content):
    dist = build('fab-disabled', {'layout': {'backToTop': False}, 'friendsPage': {'enabled': False}, 'friends': [{'name': 'Test link', 'url': 'https://friend.example/'}]}, content)
    server, url = start_server(dist)
    try:
        context = browser.new_context()
        external_routes(context, '/tmp/nekomi-p11/cdn')
        requests = []
        context.on('request', lambda request: requests.append(request.url))
        page = context.new_page()
        page.goto(url)
        ready(page)
        scroll(page, 1000)
        page.wait_for_timeout(400)
        expect(page.locator('[data-back-to-top], mdui-fab')).to_have_count(0)
        assert not page.evaluate('Boolean(customElements.get("mdui-fab"))')
        assert not any('/back-to-top.' in request for request in requests)
        sidebar = page.locator('[data-sidebar=desktop]')
        sidebar.locator('mdui-tab[value=friends]').click()
        sidebar.locator('[data-friends-all]').click()
        expect(page.locator('#friends-dialog')).to_have_js_property('open', True)
        assert context.request.get(url + 'friends/').status == 404
        context.close()
        print('PASS disabled FAB: no UI/module/registration; legacy friends Dialog still works', flush=True)
    finally:
        server.shutdown()
        server.server_close()


def default_screenshots(browser):
    dist = build('fab-default', {})
    server, url = start_server(dist)
    try:
        plain = browser.new_context(java_script_enabled=False)
        page = plain.new_page()
        page.goto(url)
        expect(page.locator('[data-back-to-top]')).to_be_hidden()
        plain.close()
        for mobile, mode in [(False, 'light'), (True, 'dark')]:
            context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 900}, is_mobile=mobile, has_touch=mobile)
            external_routes(context, '/tmp/nekomi-p11/cdn')
            page = context.new_page()
            page.goto(url)
            enhanced(page)
            scroll(page, 100000)
            if page.evaluate('scrollY') <= 400:
                hidden(page)  # Short default lists must not force a visible FAB.
            page.goto(url + 'posts/markdown-extensions/')
            enhanced(page)
            page.evaluate('(mode) => NekomiTheme.setMode(mode)', mode)
            scroll(page, 700)
            visible(page)
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(700)
            page.screenshot(path=str(ROOT / 'screenshots' / ('back-to-top-mobile-dark.png' if mobile else 'back-to-top-desktop-light.png')))
            context.close()
        print('PASS default template and no-JS; real default home/reader screenshots captured', flush=True)
    finally:
        server.shutdown()
        server.server_close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--screenshots', action='store_true')
    args = parser.parse_args()
    content = fixtures()
    config = {'friends': [{'name': f'Test link {i}', 'url': f'https://friend.example/{i}', 'description': 'Browser fixture'} for i in range(6)], 'appearance': {'wallpaper': {'enabled': True, 'light': 'https://images.example/wallpaper.png'}}}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
        for base in ['/', '/Nekomi/']:
            if base != '/': config['ui'] = {'navigation': {'backToTop': 'Back to top'}}
            exercise(browser, build('fab-root' if base == '/' else 'fab-base', config, content, base), base, args.screenshots)
        disabled(browser, content)
        if args.screenshots:
            default_screenshots(browser)
        browser.close()


if __name__ == '__main__':
    main()
