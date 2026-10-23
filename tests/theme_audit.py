"""P2.5: real static builds + browser matrix; fixtures never become starter articles.
Run npm run build first. --profiles limits the (sequential) build matrix.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from playwright.sync_api import sync_playwright, expect
from browser_audit import ROOT, start_server
from browse_audit import external_routes, ready

ARTIFACTS = ROOT / '.astro/p25-tests'

def build(name, config, content=None, base='/'):
    target = ARTIFACTS / name
    target.mkdir(parents=True, exist_ok=True)
    file = target / 'site.json'
    file.write_text(json.dumps(config, ensure_ascii=False))
    env = {**os.environ, 'ASTRO_TELEMETRY_DISABLED': '1', 'NEKOMI_CONFIG': str(file), 'ASTRO_OUT_DIR': str(target/'dist'), 'ASTRO_CACHE_DIR': str(target/'cache'), 'SITE_BASE': base}
    env.pop('SITE_URL', None)
    if content: env['NEKOMI_CONTENT_DIR'] = str(content)
    else: env.pop('NEKOMI_CONTENT_DIR', None)
    result = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, env=env, text=True, capture_output=True)
    (target/'build.log').write_text(result.stdout+result.stderr)
    assert result.returncode == 0, result.stdout+result.stderr
    return target/'dist'


def exercise(browser, name, dist, base, config, screenshots):
    server, url = start_server(dist, base)
    errors = []; records = []
    try:
        plain = browser.new_context(java_script_enabled=False, viewport={'width':1440,'height':900})
        external_routes(plain, '/tmp/nekomi-p11/cdn')
        static = plain.new_page(); static.goto(url)
        resolved = json.loads(static.locator('#site-data').text_content())
        expected = [tab for tab in resolved['layout']['sidebarTabs'] if tab != 'comments' or resolved['comments']['items']]
        visible = static.locator('[data-sidebar=desktop] mdui-tab-panel').evaluate_all("nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.getAttribute('value'))")
        assert visible == (expected[:1] if 'tabs' in resolved['layout']['modules'] else [])
        for link in resolved['navigation']['links']:
            assert static.get_by_role('link',name=link['label'],exact=True).count() >= 1
        plain.close()
        for mobile, mode in [(False,'light'), (False,'dark'), (True,'light'), (True,'dark')]:
            context = browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900}, is_mobile=mobile, has_touch=mobile, service_workers='block')
            external_routes(context, '/tmp/nekomi-p11/cdn')
            context.route('https://images.example/wallpaper.png', lambda r:r.fulfill(body=(ROOT/'src/assets/images/demo-home.png').read_bytes(),content_type='image/png'))
            context.route('https://analytics.example/script.js', lambda r:r.fulfill(body='window.analyticsLoads=(window.analyticsLoads||0)+1;',content_type='text/javascript'))
            context.on('weberror', lambda e:errors.append(str(e.error)))
            page = context.new_page(); page.goto(url); ready(page)
            if name == 'custom': assert page.evaluate('NekomiTheme.getMode()') == 'dark'
            page.evaluate('(mode)=>NekomiTheme.setMode(mode)',mode)
            page.wait_for_timeout(350)
            data = page.locator('#site-data').text_content(); resolved=json.loads(data)
            computed = page.evaluate("""() => {const s=getComputedStyle(document.documentElement);return {width:s.getPropertyValue('--site-width').trim(),sidebar:s.getPropertyValue('--sidebar-width').trim(),reader:s.getPropertyValue('--reader-width').trim(),radius:s.getPropertyValue('--nekomi-shape-card').trim(),font:s.getPropertyValue('--reading-font').trim(),heading:s.getPropertyValue('--identity-font').trim()}}""")
            assert computed['width'] == str(resolved['layout']['width'])+'px'
            assert computed['sidebar'] == str(resolved['layout']['sidebarWidth'])+'px'
            assert computed['reader'] == str(resolved['layout']['readerWidth'])+'px'
            assert computed['radius'] == str(resolved['appearance']['radius'])+'px'
            assert computed['font'] == resolved['appearance']['font']
            assert computed['heading'] == resolved['appearance']['headingFont']
            assert resolved['site']['name'] == config.get('site',{}).get('name','Nekomi')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (name, mode, 'home overflow')
            shell = page.evaluate('window.savedShell={wall:document.querySelector(".site-wallpaper"),sidebar:document.querySelector("[data-site-sidebar]"),drawer:document.querySelector("#mobile-drawer"),time:performance.timeOrigin};true')
            if resolved['appearance']['wallpaper']['enabled']:
                page.wait_for_selector('.wallpaper-image.is-visible')
                page.evaluate('window.savedImage=document.querySelector(".wallpaper-image")')
            else:
                assert page.locator('.wallpaper-image').count() == 0
            if name == 'minimal':
                assert page.locator('[data-search], .sidebar-tabs, #tab-tags, #tab-categories').count() == 0
                assert page.locator('a[href$="rss.xml"]').count() == 0
                assert not (dist/'sitemap-index.xml').exists()
                page.keyboard.press('/')
                assert page.evaluate('!document.querySelector("#mobile-drawer").open')
            if mobile:
                page.locator('#menu-button').click()
                expect(page.locator('#mobile-drawer')).to_have_js_property('open',True)
                if resolved['layout']['sidebarTabs'] and page.locator('[data-sidebar=mobile] mdui-tab[value=friends]').count():
                    page.locator('[data-sidebar=mobile] mdui-tab[value=friends]').click()
                    expect(page.locator('[data-sidebar=mobile] .sidebar-tabs')).to_have_js_property('value','friends')
                page.locator('#drawer-close').click(); expect(page.locator('#mobile-drawer')).to_have_js_property('open',False)
                page.wait_for_timeout(400)
            else:
                tabs=page.locator('[data-sidebar=desktop] .sidebar-tabs mdui-tab')
                expected=[t for t in resolved['layout']['sidebarTabs'] if t!='comments' or resolved['comments']['items']]
                if 'tabs' in resolved['layout']['modules']:
                    assert tabs.evaluate_all('(nodes)=>nodes.map(n=>n.value)') == expected
                    if tabs.count()>1:
                        tabs.last.click(); expect(page.locator('[data-sidebar=desktop] .sidebar-tabs')).to_have_js_property('value',expected[-1])
                else: assert tabs.count()==0
            if name == 'empty':
                expect(page.locator('[data-content-empty]')).to_be_visible()
                assert page.locator('.post-card').count()==0
                assert not (dist/'posts').exists()
            else:
                first = page.locator('.post-title a').first
                first_id=first.get_attribute('data-post'); first.click(); page.wait_for_url(url+'posts/'+first_id+'/'); ready(page)
                assert page.evaluate('savedShell.wall===document.querySelector(".site-wallpaper") && savedShell.sidebar===document.querySelector("[data-site-sidebar]") && savedShell.drawer===document.querySelector("#mobile-drawer") && savedShell.time===performance.timeOrigin')
                if resolved['appearance']['wallpaper']['enabled']: assert page.evaluate('savedImage===document.querySelector(".wallpaper-image")')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (name,mode,'reader overflow')
                if name=='minimal':
                    assert page.locator('.toc-list,.copy-code,#article-neighbors,#article-date,#article-category,#article-tags,.article-hero').count()==0
                    page.locator('.heading-anchor').last.click(); assert page.evaluate('!NekomiMotion.isScrolling()')
                    page.evaluate('scrollTo(0,0)')
                else:
                    if mobile and page.locator('#toc-toggle').count():
                        page.locator('#toc-toggle').click(); expect(page.locator('#inline-toc-item')).to_have_js_property('active',True)
                if screenshots:
                    page.wait_for_timeout(400); page.screenshot(path=str(ROOT/f'screenshots/p25-{name}-reader-{mode}-{390 if mobile else 1440}.png'))
                if name=='custom':
                    assert page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--reader-width').trim()")=='720px'
                    assert page.locator('[data-sidebar=desktop] .custom-links mdui-button').last.get_attribute('href') == base+'tags/'
                    assert page.evaluate('analyticsLoads')==1
                    assert page.locator('mdui-button[href="https://discussion.example/thread"]').count()==1
                if name == 'custom':
                    page.evaluate('scrollTo(0,0)')
                    if mobile and page.locator('#inline-toc-item').evaluate('e=>e.active'):
                        page.locator('#toc-toggle').click(); page.wait_for_timeout(400)
                    page.locator('.article-neighbor[data-direction=next]').click(); page.wait_for_url(url+'posts/markdown-guide/');ready(page)
                    assert page.locator('.toc-list,.copy-code,#article-neighbors').count() == 0
                    page.go_back(); page.wait_for_url(url+'posts/welcome/');expect(page.locator('body')).to_have_attribute('data-post-id','welcome');ready(page)
                    assert page.locator('.toc-list').count() == 2
                    assert page.locator('.copy-code').count() > 0
                page.locator('[data-return-list]').first.click();page.wait_for_url(url+'#recent');ready(page)
                assert page.evaluate('savedShell.time===performance.timeOrigin')
                if name=='custom': assert page.evaluate('analyticsLoads')==1
            if screenshots:
                if not mobile and page.locator('[data-sidebar=desktop] .sidebar-tabs mdui-tab').count(): page.locator('[data-sidebar=desktop] .sidebar-tabs mdui-tab').first.click()
                page.wait_for_timeout(400);page.screenshot(path=str(ROOT/f'screenshots/p25-{name}-home-{mode}-{390 if mobile else 1440}.png'))
            records.append({'viewport': '390x844' if mobile else '1440x900','mode':mode,'name':resolved['site']['name'],'page':page.url,'primary':resolved['appearance']['color'],'radius':resolved['appearance']['radius']})
            context.close()
        assert not errors, errors
        print('PASS config/browser:',name,'desktop/mobile light/dark, static routes, MDUI, shell persistence, no errors',flush=True)
    finally: server.shutdown();server.server_close()
    return records


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--profiles',default='default,fresh,minimal,custom,empty,personal');parser.add_argument('--screenshots',action='store_true');args=parser.parse_args()
    ARTIFACTS.mkdir(parents=True,exist_ok=True)
    starter=json.loads((ROOT/'site.config.json').read_text()); minimal=json.loads((ROOT/'examples/minimal.config.json').read_text());fresh=json.loads((ROOT/'examples/fresh.config.json').read_text());personal=json.loads((ROOT/'examples/personal/site.config.json').read_text())
    custom=json.loads(json.dumps(fresh));custom['site'].update(name='海棠笔记',avatar='images/demo-home.png',email='hello@example.com');custom['appearance'].update(color='#a24e70',font='system-ui, sans-serif',radius=18,mode='dark',wallpaper={'enabled':True,'light':'https://images.example/wallpaper.png','cacheHours':0});custom['layout'].update(width=1360,readerWidth=720,sidebarWidth=280);custom['comments']={'provider':'link','items':[{'id':'one','author':'示例读者','excerpt':'用于评论接口的测试数据','postId':'welcome','createdAt':'2026-01-03T10:00:00+08:00','demo':True}]};custom['navigation']['links'].append({'label':'标签索引','url':'/tags/'});custom['layout']['sidebarTabs']=['comments','updates','friends'];custom['analytics']={'enabled':True,'scriptUrl':'https://analytics.example/script.js','websiteId':'test-only'}
    custom_posts=ARTIFACTS/'custom-posts';custom_posts.mkdir(exist_ok=True)
    for source in (ROOT/'src/content/posts').glob('*.md'): shutil.copy(source,custom_posts/source.name)
    welcome=custom_posts/'welcome.md';welcome.write_text(welcome.read_text().replace("pinned: true", "pinned: true\nauthor: 客座作者\nupdated: '2026-01-04'\ndescription: 单篇 SEO 描述\ncover: images/demo-home.png\ncommentsUrl: https://discussion.example/thread"))
    (custom_posts/'older-pinned.md').write_text("---\ntitle: 旧日期置顶测试\ndate: '2020-01-01'\npinned: true\ndemo: true\n---\n\n仅用于临时验证列表置顶不改变相邻文章的时间顺序。")
    hidden=custom_posts/'draft.md';hidden.write_text("---\ntitle: 不应公开的草稿\ndate: '2027-01-01'\ndraft: true\n---\n\n草稿")
    # Per-post false overrides must affect HTML before JS, not merely hide after enhancement.
    override=custom_posts/'markdown-guide.md';override.write_text(override.read_text().replace('demo: true','demo: true\nreading:\n  toc: false\n  copyCode: false\n  neighbors: false'))
    empty=ARTIFACTS/'empty-posts';empty.mkdir(exist_ok=True)
    profiles={'default':(starter,None,'/'),'fresh':(fresh,None,'/'),'minimal':(minimal,None,'/'),'custom':(custom,custom_posts,'/Nekomi/'),'empty':(starter,empty,'/'),'personal':(personal,ROOT/'examples/demo-posts','/')}
    report={}
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        for name in args.profiles.split(','):
            config,content,base=profiles[name];dist=build(name,config,content,base)
            if name=='custom':
                assert not (dist/'posts/draft').exists()
                html=(dist/'posts/markdown-guide/index.html').read_text()
                assert 'class="copy-code"' not in html and 'class="toc-list"' not in html and 'id="article-neighbors"' not in html
                assert '客座作者' in (dist/'posts/welcome/index.html').read_text()
            report[name]=exercise(browser,name,dist,base,config,args.screenshots)
        browser.close()
    previous = json.loads((ARTIFACTS/'results.json').read_text()) if (ARTIFACTS/'results.json').exists() else {}
    previous.update(report)
    (ARTIFACTS/'results.json').write_text(json.dumps(previous,ensure_ascii=False,indent=2))
    print('PASS P2.5 configuration matrix:',len(report),'production static builds',flush=True)
if __name__=='__main__': main()
