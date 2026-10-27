"""Targeted production builds for pages, sections, user scripts and fonts."""
import argparse, base64, hashlib, json, os, shutil
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from playwright.sync_api import sync_playwright, expect
from browser_audit import ROOT, ready, start_server
from browse_audit import external_routes
from theme_audit import ARTIFACTS, build
FONT = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.2.6/files/noto-sans-latin-400-normal.woff2'
MODULE = '''window.moduleEvals=(window.moduleEvals||0)+1;export function mount(ctx){window.globalMounts=(window.globalMounts||0)+1;const e=document.createElement('span');e.dataset.globalDemo='';e.textContent='Global fixture';ctx.container.append(e);ctx.on(window,'fixture-event',()=>window.globalEvents=(window.globalEvents||0)+1);return ()=>e.remove()}'''
CLASSIC = '''window.classicEvals=(window.classicEvals||0)+1;window.NekomiScripts.register(document.currentScript.src,{mount(ctx){const e=document.createElement('span');e.dataset.classicDemo='';ctx.container.append(e);return ()=>e.remove()}});'''
ASYNC = '''window.asyncEvals=(window.asyncEvals||0)+1;export async function mount(ctx){window.pageMounts=(window.pageMounts||0)+1;const e=document.createElement('span');e.dataset.asyncDemo='';ctx.container.append(e);ctx.on(window,'fixture-event',()=>window.pageEvents=(window.pageEvents||0)+1);await new Promise(r=>setTimeout(r,350));return ()=>{window.pageDestroys=(window.pageDestroys||0)+1;e.remove()}}'''
BAD = 'window.invalidIntegrityExecuted=true;'
def integrity(body): return 'sha256-'+base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()

def fixtures():
    folder=ARTIFACTS/'site-features-pages';folder.mkdir(parents=True,exist_ok=True)
    body=(ROOT/'src/content/posts/markdown-extensions.md').read_text().split('---',2)[2]
    for name in ['about','message','projects','hidden','renamed']:
        meta={'title':name.title()+' PAGE_ONLY_TOKEN','slug':'notes/reference' if name=='renamed' else name,'description':'Independent content description','demo':name!='about','comments':name=='about','commentId':'stable-about' if name=='about' else name,'draft':name=='hidden'}
        (folder/(name+'.md')).write_text('---\n'+json.dumps(meta)+'\n---\n\n'+body)
    return folder

def cfg(standalone=False):
    c=json.loads((ROOT/'examples/site-features.config.json').read_text())
    c.update(demo=False,publishing={'url':'https://blog.example','indexing':True})
    c['navigation']['pageTabs'].append({'slug':'message','label':'留言','enabled':True})
    c['comments']={'provider':'custom','custom':{'module':'./examples/comments/rest-adapter.ts','options':{'endpoint':'https://comments.example/'}}}
    if standalone:c['layout']['sidebarSections']=[{'id':'comments','display':'standalone','position':'above'},{'id':'friends','display':'standalone','position':'below'},{'id':'updates','display':'standalone','position':'below'}]
    c['scripts']={'global':[{'src':'https://scripts.example/global.js','type':'module','position':'body-end','integrity':integrity(MODULE)},{'src':'https://scripts.example/classic.js','type':'classic','position':'head','integrity':integrity(CLASSIC)},{'src':'https://scripts.example/disabled.js','enabled':False}], 'byPage':[{'path':'/about/','src':'/js/nekomi-page-demo.js','type':'module','position':'head'},{'path':'/about/','src':'https://scripts.example/async.js','integrity':integrity(ASYNC)},{'path':'/projects/','src':'https://scripts.example/fail.js'},{'path':'/projects/','src':'https://scripts.example/bad.js','integrity':integrity('different code')}]}
    c['appearance']['webFonts'].append({'family':'Local Audit','src':'/fonts/audit.woff2','weight':'400','style':'italic','preload':False})
    return c

class Routes:
    def __init__(self,context,cors=True):
        self.calls=[];self.scripts=[];self.fonts=[];self.cors=cors
        external_routes(context,'/tmp/nekomi-p11/cdn')
        context.route('https://comments.example/**',self.comments)
        context.route('https://scripts.example/**',self.script)
        context.route(FONT,self.font)
    def font(self,route):
        self.fonts.append(route.request.url)
        route.fulfill(body=Path('/tmp/nekomi-noto-font.woff2').read_bytes(),content_type='font/woff2',headers={'access-control-allow-origin':'*'} if self.cors else {'access-control-allow-origin':'https://wrong.example'})
    def script(self,route):
        self.scripts.append(route.request.url)
        body={'global.js':MODULE,'classic.js':CLASSIC,'async.js':ASYNC,'bad.js':BAD}.get(urlsplit(route.request.url).path.rsplit('/',1)[-1])
        route.fulfill(status=200 if body else 503,body=body or 'offline',content_type='application/javascript',headers={'access-control-allow-origin':'*'})
    def comments(self,route):
        self.calls.append(route.request.url)
        headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'}
        if route.request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
        path=urlsplit(route.request.url).path
        if path.endswith('/recent'):data=[{'id':'one','key':'/pages/stable-about/','author':'Reader','excerpt':'A real adapter fixture','createdAt':'2026-01-01T00:00:00Z'}]
        elif path.endswith('/count'):data={'count':1}
        else:data=[{'id':'one','author':'Reader','text':'Comment fixture'}]
        route.fulfill(body=json.dumps(data),content_type='application/json',headers=headers)

def loaded(page,kind):
    expect(page.locator('body')).to_have_attribute('data-page',kind);ready(page)
def tab(page,value):
    page.locator('#tab-'+value).click();expect(page.locator('#content-tabs')).to_have_js_property('value',value)
def follow(page,locator,kind):
    href=locator.get_attribute('href');locator.click();page.wait_for_url('**'+href);loaded(page,kind)

def exercise(browser,dist,base,standalone,screenshots):
    server,url=start_server(dist,base)
    try:
        assert not (dist/'hidden/index.html').exists()
        assert (dist/'notes/reference/index.html').exists()
        assert '/about/' not in (dist/'rss.xml').read_text()
        for mobile,mode in [(False,'light'),(False,'dark'),(True,'light'),(True,'dark')]:
            context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,service_workers='block')
            routes=Routes(context);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url);loaded(page,'home');page.evaluate('(m)=>NekomiTheme.setMode(m)',mode)
            page.wait_for_function('window.globalMounts===1 && window.classicEvals===1')
            assert page.locator('[data-global-demo],[data-classic-demo]').count()==2
            assert page.evaluate('window.moduleEvals')==1
            data=json.loads(page.locator('#site-data').text_content());assert len(data['posts'])==3 and len(data['pages'])==4
            assert 'projects' not in page.locator('#content-tabs > mdui-tab').evaluate_all('nodes=>nodes.map(n=>n.value)')
            expect(page.locator('#tab-page-projects')).to_have_count(0)
            assert page.evaluate('(()=>{let ids=[...document.querySelectorAll("[id]")].map(n=>n.id);return new Set(ids).size===ids.length})()')
            page.evaluate('window.shell={wall:document.querySelector(".site-wallpaper"),side:document.querySelector("[data-site-sidebar]"),fab:document.querySelector("mdui-fab"),time:performance.timeOrigin}')
            if mobile:assert not routes.calls,'Closed Drawer must not query latest comments'
            if mobile:page.locator('#menu-button').click()
            sidebar=page.locator(f'[data-sidebar={"mobile" if mobile else "desktop"}]')
            if standalone:
                expect(sidebar.locator('.sidebar-tabs')).to_have_count(0)
                assert sidebar.locator('[data-sidebar-section]').evaluate_all('nodes=>nodes.map(n=>n.dataset.sidebarSection)')==['comments','friends','updates']
            else:
                assert sidebar.locator('.sidebar-tabs mdui-tab').evaluate_all('nodes=>nodes.map(n=>n.value)')==['updates','comments']
                friends=sidebar.locator('[data-sidebar-section=friends]');expect(friends).to_be_visible()
                page.evaluate('window.friendNode=document.querySelector("[data-sidebar='+('mobile' if mobile else 'desktop')+'] [data-sidebar-section=friends]")')
                sidebar.locator('mdui-tab[value=comments]').click()
                expect(friends).to_be_visible()
            page.wait_for_function('document.querySelector("[data-sidebar='+('mobile' if mobile else 'desktop')+'] [data-comments-recent-list] mdui-list-item")')
            expect(sidebar.locator('[data-comments-recent-list] mdui-list-item')).to_have_attribute('href',base+'about/#comment-one')
            initial=len([u for u in routes.calls if '/recent' in u]);assert initial==1
            if not standalone:
                sidebar.locator('mdui-tab[value=updates]').click();assert page.evaluate('friendNode.isConnected')
            if mobile:page.locator('#drawer-close').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',False)
            tab(page,'page-about');expect(page.locator('#panel-page-about h1')).to_contain_text('About')
            expect(page.locator('#panel-page-about .katex')).not_to_have_count(0)
            expect(page.locator('#panel-page-about [data-md-tabs]')).not_to_have_count(0)
            # Native nested content Tabs survive outer Tab deactivation/re-entry.
            inner=page.locator('#panel-page-about [data-md-tabs]').first
            inner.locator(':scope > mdui-tab').last.click()
            selected=inner.evaluate('e=>e.value');tab(page,'page-message');tab(page,'page-about');assert inner.evaluate('e=>e.value')==selected
            page.locator('#panel-page-about .heading-anchor').first.click();page.wait_for_function('!NekomiMotion.isScrolling()')
            assert page.locator('#content-tabs').evaluate('e=>e.value')=='page-about'
            fragment=page.url
            page.go_back();loaded(page,'home');expect(page.locator('#content-tabs')).to_have_js_property('value','page-about')
            page.go_forward();page.wait_for_url(fragment);loaded(page,'home')
            # Only matching canonical URLs run byPage scripts, not home #page-about.
            assert page.locator('[data-page-script-demo]').count()==0
            page.locator('#panel-page-about .reader-breadcrumb mdui-button').scroll_into_view_if_needed();saved_y=page.evaluate('scrollY')
            follow(page,page.locator('#panel-page-about .reader-breadcrumb mdui-button'),'content')
            expect(page.locator('[data-page-script-demo]')).to_have_count(1)
            page.go_back();loaded(page,'home');expect(page.locator('#content-tabs')).to_have_js_property('value','page-about')
            page.wait_for_function('(y)=>Math.abs(scrollY-y)<=2',arg=saved_y,timeout=5000)
            page.go_forward();loaded(page,'content')
            expect(page.locator('[data-page-script-demo]')).to_have_count(1)
            page.wait_for_function('window.pageMounts>=1')
            graph=json.loads(page.locator('script[type="application/ld+json"]').text_content())['@graph'];assert any(n['@type']=='WebPage' for n in graph) and not any(n['@type']=='BlogPosting' for n in graph)
            expect(page.locator('link[rel=canonical]')).to_have_attribute('href','https://blog.example'+base+'about/')
            expect(page.locator('[data-comments-section]')).to_have_attribute('data-comments-key','/pages/stable-about/')
            page.locator('[data-comments-section]').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready')
            assert any('/comments?key=%2Fpages%2Fstable-about%2F' in u for u in routes.calls)
            page.evaluate('document.fonts.ready');assert page.evaluate("document.fonts.check('16px \"Noto Sans Latin\"')")
            page.evaluate('document.fonts.load(\'italic 400 16px "Local Audit"\')')
            assert context.request.get(url+'fonts/audit.woff2').status==200
            expect(page.locator('link[as=font]')).to_have_count(1)
            if screenshots and base=='/' and mode=='light' and not mobile:
                page.evaluate('scrollTo(0,0)');page.wait_for_timeout(400);page.screenshot(path=str(ROOT/'screenshots/site-features-page-desktop.png'))
            # Page-specific cleanup and failures never block navigation or core UI.
            page.evaluate('window.eventsBefore=window.pageEvents||0')
            follow(page,page.locator('.reader-breadcrumb mdui-button'),'home')
            expect(page.locator('[data-page-script-demo],[data-async-demo]')).to_have_count(0)
            page.evaluate('dispatchEvent(new Event("fixture-event"))');assert page.evaluate('(window.pageEvents||0)===eventsBefore')
            tab(page,'page-about');follow(page,page.locator('#panel-page-about .reader-breadcrumb mdui-button'),'content')
            expect(page.locator('[data-page-script-demo]')).to_have_count(1)
            page.wait_for_function('window.pageMounts>=2')
            # Leave while an async mount is unresolved; late cleanup still runs.
            page.locator('.reader-breadcrumb mdui-button').click();loaded(page,'home')
            page.wait_for_function('window.pageDestroys>=2')
            follow(page,page.locator('.top-links mdui-button').first,'content')
            expect(page.locator('#reader h1')).to_contain_text('Projects')
            expect(page.locator('[data-comments-section]')).to_have_count(0)
            page.wait_for_timeout(350);assert not page.evaluate('Boolean(window.invalidIntegrityExecuted)')
            page.go_back();loaded(page,'home')
            assert page.evaluate('shell.wall===document.querySelector(".site-wallpaper")&&shell.side===document.querySelector("[data-site-sidebar]")&&shell.fab===document.querySelector("mdui-fab")&&shell.time===performance.timeOrigin')
            assert page.evaluate('globalMounts===1&&moduleEvals===1&&classicEvals===1&&asyncEvals===1')
            assert not any('/disabled.js' in u for u in routes.scripts)
            assert len(routes.fonts)==1,'ClientRouter must not refetch WOFF2'
            assert len([u for u in routes.scripts if u.endswith('/global.js')])==1
            assert len([u for u in routes.calls if '/recent' in u])==initial
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert not errors,errors
            if screenshots and base=='/' and mode=='dark' and mobile:
                page.evaluate('scrollTo(0,0)');tab(page,'page-about');page.wait_for_timeout(400);page.screenshot(path=str(ROOT/'screenshots/site-features-tab-mobile.png'))
            context.close();print('PASS site features',base,mobile,mode,'pages/Tabs/sections/comments/scripts/fonts/history',flush=True)
        # Real CORS failure: declared font fails, system fallback still renders.
        context=browser.new_context();Routes(context,cors=False);page=context.new_page();page.goto(url);loaded(page,'home');page.evaluate('document.fonts.ready');page.evaluate("document.fonts.load('16px \"Noto Sans Latin\"', 'Nekomi').catch(() => [])")
        assert page.evaluate('[...document.fonts].some(f=>f.family.includes("Noto Sans Latin")&&f.status==="error")')
        expect(page.locator('.sidebar .site-name')).to_be_visible();context.close()
        plain=browser.new_context(java_script_enabled=False);page=plain.new_page();page.goto(url);expect(page.locator('noscript .browse-links a[href$="about/"]')).to_have_count(1)
        page.goto(url+'projects/');expect(page.locator('#article-body pre')).not_to_have_count(0);plain.close()
    finally:server.shutdown();server.server_close()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--screenshots',action='store_true');parser.add_argument('--reuse',action='store_true');args=parser.parse_args()
    folder=fixtures();previous=os.environ.get('NEKOMI_PAGES_DIR');os.environ['NEKOMI_PAGES_DIR']=str(folder)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
            for base,standalone in [('/',False),('/Nekomi/',True)]:
                name='site-features-root' if base=='/' else 'site-features-base'
                dist=ARTIFACTS/name/'dist'
                if not args.reuse or not dist.exists():dist=build(name,cfg(standalone),base=base)
                fonts=dist/'fonts';fonts.mkdir(exist_ok=True);shutil.copy(ROOT/'node_modules/katex/dist/fonts/KaTeX_Main-Italic.woff2',fonts/'audit.woff2')
                exercise(browser,dist,base,standalone,args.screenshots)
            browser.close()
    finally:
        if previous is None:os.environ.pop('NEKOMI_PAGES_DIR',None)
        else:os.environ['NEKOMI_PAGES_DIR']=previous
if __name__=='__main__':main()
