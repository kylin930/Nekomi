"""Opt-in decorative resources. Real PNG, real vendor SDKs, controlled service APIs.
Temporary CC-BY 4.0 Twemoji artwork is cached in /tmp, never a theme asset.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_audit import ROOT, start_server
from browse_audit import external_routes, ready
from theme_audit import build, ARTIFACTS
from comments_audit import Services, config as comment_config

SOURCE = 'https://raw.githubusercontent.com/jdecked/twemoji/b6b55fef1e8636b540a6d016a4729ca8cdf2e60b/assets/72x72/1f9cd.png'
LANDSCAPE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/1280px-Fronalpstock_big.jpg'
SHA = 'd13ddabf546f9dec18b0c19778d79937573cd266f6154d531d85c1ae788fb86b'
SCREENSHOTS = ROOT / 'screenshots'


def material():
    file = Path('/tmp/nekomi-decoration-person.png')
    if not file.exists():
        subprocess.run(['curl', '-fLsS', '--max-time', '60', SOURCE, '-o', str(file)], check=True)
    assert hashlib.sha256(file.read_bytes()).hexdigest() == SHA
    return file


def wallpaper_material():
    file = Path('/tmp/nekomi-decoration-wallpaper.jpg')
    if not file.exists(): subprocess.run(['curl','-fLsS','--max-time','60',LANDSCAPE,'-o',str(file)],check=True)
    return file


def decorate(provider, mobile=False):
    c = comment_config(provider)
    c['site'] = {'favicon': '/images/icon.png', 'appleTouchIcon': '/images/touch.png'}
    c['appearance'].update(decorations={k: {'enabled': True, 'light': '/images/character.png', 'dark': 'https://images.example/dark.png', 'mobile': mobile} for k in ['sidebar', 'comments']})
    c['appearance']['wallpaper'] = {'enabled': True, 'light': '/images/desktop.png', 'dark': '/images/desktop-dark.png', 'mobileLight': '/images/mobile.png', 'mobileDark': '/images/mobile-dark.png', 'cacheHours': 0}
    c['layout'].update(recentPostsLimit=2, friendsPreviewLimit=1)
    c['friends'] = [{'name': '测试友链 ' + str(i), 'url': 'https://example.com/' + str(i), 'description': '仅用于浏览器验收'} for i in range(4)]
    return c


def assets(dist):
    folder = dist / 'images'
    folder.mkdir(exist_ok=True)
    for name in ['character.png', 'icon.png', 'touch.png']:
        shutil.copy(material(), folder / name)
    for name in ['desktop.png', 'desktop-dark.png', 'mobile.png', 'mobile-dark.png']:
        shutil.copy(wallpaper_material(), folder / name)


def shot(page, label, enabled):
    if enabled:
        if label.startswith('comments-'): page.evaluate('scrollBy({top:document.querySelector("#comments").getBoundingClientRect().top-84,behavior:"instant"})')
        page.wait_for_timeout(700)
        page.screenshot(path=str(SCREENSHOTS / ('v100-decorations-' + label + '.png')))


def disjoint(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'page overflow'
    assert page.locator('[data-decoration=comments]').evaluate('node => { if (getComputedStyle(node).display === "none" || node.hidden) return true; const image=node.querySelector("img").getBoundingClientRect(), mount=document.querySelector("[data-comments-mount]").getBoundingClientRect(); return image.right<=mount.left+1 || image.left>=mount.right-1 || image.bottom<=mount.top+1 || image.top>=mount.bottom-1; }'), 'art overlaps comment widget'


def run_provider(browser, provider, base, screenshots, mobile=False):
    cfg = decorate(provider, mobile)
    if mobile:
        cfg['appearance']['decorations']['sidebar'].update(dark='', align='center', offsetX=-12, offsetY=-8)
        cfg['appearance']['decorations']['comments'].update(dark='', offsetX=12, offsetY=-12)
        cfg['appearance']['wallpaper']['mobileDark']=''
    dist = build('decorations-' + provider + ('-mobile' if mobile else ''), cfg, base=base)
    assets(dist)
    server, url = start_server(dist, base)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, service_workers='block')
    services = Services(context, provider)
    context.route('https://images.example/dark.png', lambda r: r.fulfill(body=material().read_bytes(), content_type='image/png'))
    errors = []
    context.add_init_script("""window.decorationTrace=[]; for(const name of ['astro:before-preparation','astro:after-preparation','astro:before-swap','astro:after-swap','astro:page-load']) document.addEventListener(name,e=>{decorationTrace.push([name,performance.now(),location.href]); if(name==='astro:before-swap'){window.decorationTransition=e.viewTransition.finished;for(const key of ['ready','updateCallbackDone','finished']) e.viewTransition[key].then(()=>decorationTrace.push([key,performance.now()]),error=>decorationTrace.push([key,performance.now(),error.message]));}});""")
    page = context.new_page()
    def page_error(error):
        errors.append(str(error))
        (dist.parent/'error-trace.json').write_text(json.dumps({'error':str(error),'at':page.evaluate('({url:location.href,trace:window.decorationTrace})')},indent=2))
    page.on('pageerror', page_error)
    try:
        page.goto(url); ready(page)
        side = page.locator('.sidebar [data-decoration=sidebar]')
        expect(side).to_be_visible()
        expect(side.locator('img')).to_have_attribute('src', base + 'images/character.png')
        page.wait_for_selector('.wallpaper-image.is-visible')
        expect(page.locator('link[rel=icon]')).to_have_attribute('href', base + 'images/icon.png')
        expect(page.locator('link[rel=apple-touch-icon]')).to_have_attribute('href', base + 'images/touch.png')
        assert page.locator('[data-sidebar=desktop] mdui-tab-panel[value=updates] mdui-list-item').count() == 2
        assert page.locator('[data-sidebar=desktop] .friend-list mdui-list-item').count() == 1
        assert side.evaluate('e => getComputedStyle(e).pointerEvents === "none" && e.getAttribute("aria-hidden")==="true"')
        assert side.evaluate('e => { const image=e.querySelector("img");const r=image.getBoundingClientRect(), p=e.parentElement.getBoundingClientRect(), before=e.previousElementSibling.getBoundingClientRect();return r.top>=before.bottom && r.bottom<=innerHeight && r.left>=p.left && r.right<=p.right+1 && Math.abs(r.width/r.height-image.naturalWidth/image.naturalHeight)<.01 && p.height>=e.parentElement.scrollHeight-1; }')
        page.evaluate('window.savedDecoration={node:document.querySelector(".sidebar [data-decoration]"), image:document.querySelector(".sidebar [data-decoration] img"), wall:document.querySelector(".wallpaper-image"), origin:performance.timeOrigin}')
        if provider == 'waline': shot(page, 'home-light-1440', screenshots)
        page.evaluate('NekomiTheme.setMode("dark")')
        expect(side.locator('img')).to_have_attribute('src', base + 'images/character.png' if mobile else 'https://images.example/dark.png')
        page.wait_for_function('document.querySelector(".wallpaper-image:last-child")?.src.endsWith("/desktop-dark.png")')
        if provider == 'waline': shot(page, 'home-dark-1440', screenshots)
        page.evaluate('NekomiTheme.setMode("light")')
        expect(side.locator('img')).to_have_attribute('src', base + 'images/character.png')
        page.wait_for_function('document.querySelector(".wallpaper-image:last-child")?.src.endsWith("/desktop.png")')
        page.wait_for_timeout(750)
        page.evaluate('savedDecoration.wall=document.querySelector(".wallpaper-image"); savedDecoration.image=document.querySelector(".sidebar [data-decoration] img")')
        page.locator('.post-title a[data-post=welcome]').click(); page.wait_for_url(url + 'posts/welcome/'); expect(page.locator('body')).to_have_attribute('data-post-id', 'welcome'); ready(page)
        assert page.evaluate('savedDecoration.origin===performance.timeOrigin && savedDecoration.node===document.querySelector(".sidebar [data-decoration]") && savedDecoration.image===document.querySelector(".sidebar [data-decoration] img") && savedDecoration.wall===document.querySelector(".wallpaper-image")')
        page.locator('#comments').scroll_into_view_if_needed()
        expect(page.locator('#comments')).to_have_attribute('data-state', 'ready', timeout=30000)
        expect(page.locator('[data-decoration=comments]')).to_be_visible()
        disjoint(page)
        if provider == 'waline': shot(page, 'comments-light-1440', screenshots)
        page.evaluate('NekomiTheme.setMode("dark")')
        expect(page.locator('[data-decoration=comments] img')).to_have_attribute('src', base + 'images/character.png' if mobile else 'https://images.example/dark.png')
        disjoint(page)
        if provider == 'waline': shot(page, 'comments-dark-1440', screenshots)
        for _ in range(2):
            previous = page.locator('[data-decoration=comments]').element_handle()
            page.locator('.article-neighbor[data-direction=next]').click(); page.wait_for_url(url + 'posts/markdown-guide/'); expect(page.locator('body')).to_have_attribute('data-post-id', 'markdown-guide'); ready(page)
            assert not previous.evaluate('e => e.isConnected')
            page.locator('#comments').scroll_into_view_if_needed()
            expect(page.locator('#comments')).to_have_attribute('data-state', 'ready', timeout=20000)
            expect(page.locator('[data-decoration=comments]')).to_have_count(1)
            disjoint(page)
            page.go_back(); page.wait_for_url(url + 'posts/welcome/'); expect(page.locator('body')).to_have_attribute('data-post-id', 'welcome'); ready(page)
        # Responsive mode switches the wallpaper source, not its persistent layer.
        # Finish the navigation capture before changing CDP emulated device metrics.
        # Rapid history navigation above remains intentionally unsynchronized.
        page.evaluate('window.decorationTransition')
        for width, height in [(1280, 800), (1024, 768), (390, 844), (320, 700)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.locator('#comments').scroll_into_view_if_needed()
            expect(page.locator('#comments')).to_have_attribute('data-state', 'ready', timeout=20000)
            page.wait_for_timeout(400)
            if width < 1120:
                if mobile: expect(page.locator('[data-decoration=comments]')).to_be_visible()
                else: expect(page.locator('[data-decoration=comments]')).to_be_hidden()
                assert page.locator('#mobile-drawer [data-decoration=sidebar]').count() == (1 if mobile else 0)
            disjoint(page)
        page.set_viewport_size({'width': 390, 'height': 844})
        for mode in ['light', 'dark']:
            page.evaluate('(mode) => NekomiTheme.setMode(mode)', mode)
            suffix = '/desktop-dark.png' if mobile and mode=='dark' else '/mobile' + ('-dark' if mode=='dark' else '') + '.png'
            page.wait_for_function('(suffix) => document.querySelector(".wallpaper-image:last-child")?.src.endsWith(suffix)', arg=suffix)
            page.locator('#comments').scroll_into_view_if_needed()
            if provider == 'waline' or mobile: shot(page, 'comments-' + mode + '-390' + ('-opt-in' if mobile else ''), screenshots)
        page.locator('#menu-button').click(); expect(page.locator('#mobile-drawer')).to_have_js_property('open', True)
        if mobile:
            # The content may consume all room: opt-in never forces a new scroll area.
            art = page.locator('#mobile-drawer [data-decoration]')
            if art.is_visible(): assert art.bounding_box()['y'] + art.bounding_box()['height'] <= 844
        if provider == 'waline': shot(page, 'drawer-390', screenshots)
        page.locator('#drawer-close').click()
        page.set_viewport_size({'width': 1440, 'height': 500}); page.wait_for_timeout(500)
        expect(side).to_be_hidden()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        # A failed service must never leave a decoration alongside an unusable editor.
        services.fail_sdk = provider != 'custom'; services.fail = provider == 'custom'
        page.goto(url+'posts/welcome/'); ready(page);page.locator('#comments').scroll_into_view_if_needed()
        expect(page.locator('#comments')).to_have_attribute('data-state','error',timeout=20000)
        expect(page.locator('[data-decoration=comments]')).to_be_hidden()
        services.fail_sdk=False;services.fail=False;page.locator('[data-comment-retry]').click()
        expect(page.locator('#comments')).to_have_attribute('data-state','ready',timeout=20000)
        page.emulate_media(reduced_motion='reduce')
        assert page.locator('[data-decoration=comments] img').evaluate('e=>getComputedStyle(e).animationName==="none"')
        if errors: (dist.parent/'navigation-trace.json').write_text(json.dumps(page.evaluate('decorationTrace'),indent=2))
        assert not errors, errors
        if mobile: phone(browser, provider, dist, base, screenshots)
        print('PASS decoration provider:', provider, base, 'light/dark, 5 widths, short viewport, iframe-safe layout, repeated navigation, retained wallpaper/side DOM', flush=True)
    finally:
        context.close(); server.shutdown(); server.server_close()


def phone(browser, provider, dist, base, screenshots):
    server,url=start_server(dist,base)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
    services=Services(context,provider);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        page.goto(url+'posts/welcome/');ready(page);page.locator('#comments').scroll_into_view_if_needed()
        expect(page.locator('#comments')).to_have_attribute('data-state','ready',timeout=20000)
        art=page.locator('[data-decoration=comments]');expect(art).to_be_visible();disjoint(page)
        assert art.locator('img').bounding_box()['height']<=104
        page.locator('#menu-button').tap();expect(page.locator('#mobile-drawer')).to_have_js_property('open',True)
        expect(page.locator('#mobile-drawer [data-decoration]')).to_be_visible()
        # The alternate documented alignment must also fit inside the padded Drawer.
        page.locator('#mobile-drawer [data-decoration]').evaluate('n=>n.dataset.align="right"')
        page.evaluate('NekomiTheme.syncDocument()');page.wait_for_timeout(100)
        assert page.locator('#mobile-drawer [data-decoration]').evaluate('n=>{const r=n.getBoundingClientRect(), image=n.querySelector("img").getBoundingClientRect();return image.left>=r.left && image.right<=r.right+1}')
        shot(page,'drawer-opt-in-390',screenshots)
        page.locator('#drawer-close').tap();page.emulate_media(color_scheme='dark');page.evaluate('NekomiTheme.setMode("auto")')
        expect(art.locator('img')).to_have_attribute('src',base+'images/character.png')
        assert not errors,errors
        print('PASS real touch mobile:',base,'opt-in Drawer image, compact non-overlapping comments, system dark fallback',flush=True)
    finally:context.close();server.shutdown();server.server_close()


def edges(browser, screenshots):
    # Empty / disabled values must not load assets or reserve a slot, even with comments configured.
    cfg = {'site': {'favicon':' ', 'appleTouchIcon':' '}, 'appearance': {'decorations': {'sidebar': {'enabled': True}, 'comments': {'enabled': True, 'light': ''}}}, 'layout': {'recentPostsLimit': 0, 'friendsPreviewLimit': 0}}
    dist = build('decorations-empty', cfg)
    server, url = start_server(dist)
    context = browser.new_context(viewport={'width':1440, 'height':900}, service_workers='block')
    external_routes(context, '/tmp/nekomi-p11/cdn'); page = context.new_page();requests=[];page.on('request',lambda r:requests.append(r.url))
    page.goto(url); ready(page)
    assert page.locator('[data-decoration], #side-desktop-updates, #side-desktop-friends').count() == 0
    assert not page.locator('link[rel=apple-touch-icon]').count()
    expect(page.locator('link[rel=icon]')).to_have_attribute('href','data:,')
    page.goto(url+'posts/welcome/'); ready(page)
    assert page.locator('[data-comments-section], [data-decoration]').count() == 0
    assert not any('/decorations.' in u for u in requests)
    context.close(); server.shutdown(); server.server_close()
    # A broken image must release the comment rail without breaking the real editor.
    cfg = comment_config('waline')
    cfg['appearance']['decorations'] = {'sidebar': {'enabled':True,'light':'/missing.png'}, 'comments': {'enabled':True,'light':'/missing.png'}}
    dist = build('decorations-broken', cfg)
    server,url = start_server(dist); context=browser.new_context(service_workers='block'); services=Services(context,'waline');page=context.new_page()
    page.goto(url);ready(page);page.wait_for_timeout(500)
    expect(page.locator('[data-decoration]')).to_be_hidden()
    page.goto(url+'posts/welcome/');ready(page);page.locator('#comments').scroll_into_view_if_needed()
    expect(page.locator('#comments')).to_have_attribute('data-state','ready',timeout=20000)
    expect(page.locator('[data-decoration=comments]')).to_be_hidden()
    assert page.locator('.comments-body').evaluate('e=>Math.abs(e.getBoundingClientRect().width-e.querySelector("[data-comments-mount]").getBoundingClientRect().width)<1')
    editor=page.frame_locator('[data-comments-mount]>iframe').locator('textarea:visible').first
    editor.fill('图片失效不影响输入');expect(editor).to_have_value('图片失效不影响输入')
    context.close();server.shutdown();server.server_close()
    # Same real PNG, but many sidebar items and long intro: the image gives way to content.
    cfg = decorate('custom', True);cfg['site']['intro']='侧栏长内容测试。'*70;cfg['layout'].update(recentPostsLimit=12,friendsPreviewLimit=12)
    cfg['appearance']['decorations']['sidebar'].update(align='center',offsetX=-48,offsetY=32,width=320)
    dist=build('decorations-crowded',cfg);assets(dist);server,url=start_server(dist);context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block');services=Services(context,'custom');page=context.new_page()
    page.goto(url);ready(page);expect(page.locator('.sidebar [data-decoration]')).to_be_hidden()
    assert page.locator('.sidebar').evaluate('e=>e.querySelectorAll("[data-decoration]").length===1 && getComputedStyle(e).overflowY==="auto"')
    page.set_viewport_size({'width':390,'height':700});page.locator('#menu-button').click();page.wait_for_timeout(500);expect(page.locator('#mobile-drawer [data-decoration]')).to_be_hidden()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    context.close();server.shutdown();server.server_close()
    print('PASS decoration edge builds: empty/disabled, comments off, broken image, zero preview limits, crowded sidebar/Drawer',flush=True)


def default_shots(browser, screenshots):
    if not screenshots: return
    dist=build('decorations-default',{})
    server,url=start_server(dist)
    try:
        for width,height in [(1440,900),(390,844)]:
            context=browser.new_context(viewport={'width':width,'height':height},is_mobile=width==390,has_touch=width==390,service_workers='block')
            external_routes(context,'/tmp/nekomi-p11/cdn');page=context.new_page();page.goto(url+'posts/welcome/');ready(page)
            assert not page.locator('[data-decoration]').count()
            shot(page,'default-reader-'+str(width),True)
            context.close()
    finally:server.shutdown();server.server_close()


def comments_only(browser):
    cfg=comment_config('custom')
    cfg['appearance']['decorations']={'comments':{'enabled':True,'light':'/images/character.png'}}
    dist=build('decorations-comments-only',cfg);assets(dist);server,url=start_server(dist)
    context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block')
    services=Services(context,'custom');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        page.goto(url);ready(page);assert not page.locator('[data-decoration]').count()
        page.locator('.post-title a[data-post=welcome]').click();expect(page.locator('body')).to_have_attribute('data-post-id','welcome');ready(page)
        page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('#comments')).to_have_attribute('data-state','ready',timeout=20000)
        expect(page.locator('[data-decoration=comments]')).to_be_visible();disjoint(page)
        page.locator('[data-comments-mount]').evaluate('mount=>{const wide=document.createElement("div");wide.style.cssText="width:600px;height:4px";mount.append(wide)}')
        expect(page.locator('#comments')).to_have_attribute('data-decoration-layout','stacked')
        disjoint(page)
        page.locator('[data-return-list]').first.click();expect(page.locator('body')).to_have_attribute('data-page','home');ready(page)
        assert not page.locator('[data-decoration]').count()
        assert not errors,errors
        print('PASS comments-only decoration: homepage loads no decoration, ClientRouter initializes optional module on article and cleans up on return',flush=True)
    finally:context.close();server.shutdown();server.server_close()


def wallpaper_checks(browser):
    cfg={'appearance':{'wallpaper':{'enabled':True,'light':'/images/desktop.png','dark':'/missing.png','mobileLight':'/images/mobile.png','cacheHours':24}}}
    dist=build('decorations-wallpaper-cache',cfg,base='/Nekomi/');assets(dist);server,url=start_server(dist,'/Nekomi/')
    context=browser.new_context(viewport={'width':1440,'height':900})
    external_routes(context,'/tmp/nekomi-p11/cdn');page=context.new_page()
    try:
        page.goto(url);ready(page);page.wait_for_selector('.wallpaper-image.is-visible')
        page.wait_for_function('navigator.serviceWorker.controller?.scriptURL.endsWith("/Nekomi/wallpaper-cache.js")')
        assert '__nekomi_wallpaper?' in page.locator('.wallpaper-image').get_attribute('src')
        page.evaluate('window.cachedWall={node:document.querySelector(".site-wallpaper"),image:document.querySelector(".wallpaper-image")};')
        page.locator('.post-title a[data-post=welcome]').click();expect(page.locator('body')).to_have_attribute('data-post-id','welcome');ready(page)
        assert page.evaluate('cachedWall.node===document.querySelector(".site-wallpaper") && cachedWall.image===document.querySelector(".wallpaper-image")')
        page.set_viewport_size({'width':390,'height':844})
        page.wait_for_function('new URL(document.querySelector(".wallpaper-image:last-child").src).searchParams.get("source")?.endsWith("/Nekomi/images/mobile.png")')
        page.wait_for_timeout(750);page.reload();ready(page);page.wait_for_selector('.wallpaper-image.is-visible')
        assert page.evaluate('async()=>{const cache=await caches.open("nekomi-wallpaper-v1");const keys=await cache.keys();return keys.filter(k=>!k.url.includes("metadata=1")).length===2}')
        page.evaluate('NekomiTheme.setMode("dark")');expect(page.locator('.site-wallpaper')).to_be_hidden(timeout=15000)
        assert not page.locator('.wallpaper-image').count()
        page.evaluate('NekomiTheme.setMode("light")');page.wait_for_selector('.wallpaper-image.is-visible')
    finally:context.close()
    # A slow response for a previous theme must not replace the retained image.
    context=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
    external_routes(context,'/tmp/nekomi-p11/cdn');page=context.new_page();pending=[]
    context.route(url+'missing.png',lambda route:pending.append(route))
    try:
        page.goto(url);ready(page);page.wait_for_selector('.wallpaper-image.is-visible')
        with page.expect_request(url+'missing.png'):
            page.evaluate('window.retained=document.querySelector(".wallpaper-image");NekomiTheme.setMode("dark")')
        page.wait_for_timeout(50);assert pending
        page.evaluate('NekomiTheme.setMode("light")')
        for route in pending:
            try:route.fulfill(body=material().read_bytes(),content_type='image/png')
            except Exception:pass # Cancelling an Image may already cancel its route.
        page.wait_for_timeout(800)
        assert page.evaluate('retained===document.querySelector(".wallpaper-image") && !document.querySelector(".site-wallpaper").hidden')
        print('PASS mobile wallpaper: scoped real Worker/cache, refresh reuse, persisted DOM, failure fallback, interrupted theme request',flush=True)
    finally:context.close();server.shutdown();server.server_close()


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--screenshots',action='store_true');parser.add_argument('--providers',default='waline,twikoo,giscus,artalk,custom');parser.add_argument('--skip-edges',action='store_true');args=parser.parse_args()
    material()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        for provider in args.providers.split(','): run_provider(browser,provider,'/',args.screenshots)
        if not args.skip_edges:
            run_provider(browser,'custom','/Nekomi/',args.screenshots,True)
            edges(browser,args.screenshots)
            wallpaper_checks(browser)
            comments_only(browser)
            default_shots(browser,args.screenshots)
        browser.close()


if __name__=='__main__': main()
