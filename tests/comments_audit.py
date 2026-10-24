"""Real vendor SDKs with deterministic service responses. Never posts to a real service."""
import argparse, hashlib, json, os, shutil, subprocess
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright,expect
from browser_audit import ROOT,start_server
from browse_audit import external_routes,ready
from theme_audit import build
CACHE=Path('/tmp/nekomi-comment-sdks'); CACHE.mkdir(exist_ok=True)
TIMESTAMP=1792800000000

def cache(url):
    file=CACHE/hashlib.sha256(url.encode()).hexdigest()
    if not file.exists():
        subprocess.run(['curl','-fLsS','--compressed','--max-time','60','-o',str(file),url],check=True,capture_output=True)
    return file.read_bytes()

def config(provider,base='/',wallpaper=False):
    c=json.loads((ROOT/'site.config.json').read_text())
    c['comments']={'provider':provider,'lazy':True,'timeout':6000,'waline':{'serverURL':'https://comments.example'},'twikoo':{'envId':'https://comments.example'},'giscus':{'repo':'example/blog','repoId':'public-repo','category':'Comments','categoryId':'public-category'},'artalk':{'server':'https://comments.example','site':'Nekomi tests'},'custom':{'module':'./examples/comments/rest-adapter.ts','options':{'endpoint':'https://comments.example/'}}}
    c['layout']={'sidebarTabs':['updates','comments','friends']}
    c['appearance']={'wallpaper':{'enabled':wallpaper,'light':'https://images.example/wallpaper.png','cacheHours':0}}
    return c

class Services:
    def __init__(self,context,provider):
        self.provider=provider;self.calls=[];self.sdk=[];self.hold=[];self.block=False;self.fail=False;self.fail_sdk=False;self.empty=False;self.recent_key='/posts/welcome/';self.raw='<img src=https://tracking.invalid/pixel onerror="parent.xss=1">来自独立服务的留言<script>parent.xss=2</script>'
        external_routes(context,'/tmp/nekomi-p11/cdn')
        context.route('https://images.example/wallpaper.png',lambda r:r.fulfill(body=(ROOT/'src/assets/images/demo-home.png').read_bytes(),content_type='image/png'))
        context.route('https://cdn.jsdelivr.net/**',self.asset)
        context.route('https://giscus.app/client.js',self.asset)
        context.route('https://giscus.app/default.css',self.asset)
        context.route('https://giscus.app/**/widget*',self.giscus)
        context.route('https://comments.example/**',self.api)
        self.tracking=[];context.route('https://tracking.invalid/**',lambda r:(self.tracking.append(r.request.url),r.fulfill(status=204)))
        context.route('https://**gravatar.com/**',lambda r:r.fulfill(body=(ROOT/'src/assets/images/demo-home.png').read_bytes(),content_type='image/png'))
    def asset(self,route):
        self.sdk.append(route.request.url)
        if self.fail_sdk: route.fulfill(status=503,body='offline');return
        body=cache(route.request.url); mime='text/css' if urlsplit(route.request.url).path.endswith('.css') else 'application/javascript'
        route.fulfill(body=body,content_type=mime,headers={'access-control-allow-origin':'*'})
    def giscus(self,route):
        # The official client.js is real. Only the remote discussion UI/message peer is simulated.
        route.fulfill(body='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font:15px system-ui;padding:16px;overflow-wrap:anywhere}html[data-theme=dark]{color-scheme:dark;background:#1e1c20;color:#e6e1e7}button{max-width:100%;font:inherit}</style></head><body><h3>评论消息协议回归</h3><p>Giscus 远程讨论区域</p><button>使用 GitHub 登录</button><script>
document.documentElement.dataset.theme=new URL(location.href).searchParams.get('theme');
window.addEventListener('message',e=>{if(e.data?.giscus?.setConfig){document.documentElement.dataset.theme=e.data.giscus.setConfig.theme}});
parent.postMessage({giscus:{resizeHeight:260}},'*');''' + ('' if self.empty else "parent.postMessage({giscus:{discussion:{totalCommentCount:3,totalReplyCount:0}}},'*');") + '''
</script></body></html>''',content_type='text/html')
    def api(self,route):
        r=route.request; u=urlsplit(r.url); q=parse_qs(u.query)
        try: payload=json.loads(r.post_data or '{}')
        except:payload={}
        self.calls.append({'url':r.url,'method':r.method,'body':payload})
        if self.block:self.hold.append(route);return
        if self.fail: route.fulfill(status=503,body='offline',headers={'access-control-allow-origin':'*'});return
        if r.method=='OPTIONS':route.fulfill(status=204,headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,Authorization'});return
        key=q.get('path',q.get('key',q.get('page_key',q.get('page_keys',['/posts/welcome/']))))[0]
        if self.provider=='waline':
            if q.get('type')==['recent']:data=[{'objectId':1,'url':self.recent_key,'nick':'回归读者','comment':self.raw,'time':TIMESTAMP,'avatar':''}]
            elif q.get('type')==['count']:data={'errno':0,'data':[1]}
            else:data={'errno':0,'data':{'count':1,'page':1,'pageSize':10,'totalPages':1,'data':[{'objectId':1,'nick':'回归读者','comment':'<p>来自独立服务的留言</p>','orig':'来自独立服务的留言','url':key,'time':TIMESTAMP,'like':0,'sticky':False,'children':[],'avatar':'','link':'','type':'guest'}]}}
        elif self.provider=='twikoo':
            event=payload.get('event')
            if event=='GET_CONFIG':data={'config':{'VERSION':'2.0.17','IS_ADMIN':False,'EMOTION':'false','HIGHLIGHT':'false'}}
            elif event=='GET_PASSWORD_STATUS':data={'status':True,'version':'2.0.17'}
            elif event=='GET_COMMENTS_COUNT':data={'data':[{'url':v,'count':1} for v in payload.get('urls',[])]}
            elif event=='GET_RECENT_COMMENTS':data={'data':[{'id':'one','url':self.recent_key,'nick':'回归读者','commentText':'来自独立服务的留言','comment':self.raw,'created':TIMESTAMP,'avatar':''}]}
            elif event=='COMMENT_GET':data={'data':[{'id':'one','url':payload.get('url'),'nick':'回归读者','comment':'<p>来自独立服务的留言</p>','created':TIMESTAMP,'replies':[],'ups':0,'avatar':''}],'count':1}
            else:data={'time':1,'data':[]}
        elif self.provider=='artalk':
            comment={'id':1,'content':'来自独立服务的留言','content_marked':'<p>来自独立服务的留言</p>','nick':'回归读者','date':'2026-10-24 00:00:00','rid':0,'page_key':self.recent_key,'page_url':'/posts/welcome/','site_name':'Nekomi tests','visible':True,'is_allow_reply':True,'vote_up':0,'vote_down':0,'is_collapsed':False,'is_pending':False,'is_pinned':False,'is_verified':False,'ua':'','link':'','email_encrypted':'','user_id':0}
            if u.path.endswith('/conf'):data={'frontend_conf':{'emoticons':False,'imgUpload':False},'version':{'app':'Artalk','version':'2.10.0','commit_hash':'fixture'}}
            elif u.path.endswith('/conf/domain'):data={'is_trusted':True,'origin':'https://comments.example'}
            elif u.path.endswith('/conf/auth/providers'):data={'anonymous':True,'providers':[]}
            elif '/stats/latest_comments' in u.path:data={'data':[comment]}
            elif '/stats/page_comment' in u.path:data={'data':{key:1}}
            elif u.path.endswith('/comments'):
                comment['page_key']=key
                data={'comments':[comment],'count':1,'roots_count':1,'page':{'key':key,'title':'回归文章','url':'/posts/welcome/','site_name':'Nekomi tests','pv':0,'vote_up':0,'vote_down':0}}
            else:data={'user':None,'is_login':False,'notifies':[],'notifies_count':0}
        else:
            if u.path.endswith('/recent'):data=[{'id':'one','key':self.recent_key,'author':'回归读者','excerpt':self.raw,'createdAt':'2026-10-24T00:00:00Z'}]
            elif u.path.endswith('/count'):data={'count':1}
            else:data=[{'id':'one','author':'回归读者','text':'来自独立服务的留言'}]
        if self.empty:
            if self.provider=='waline':
                if isinstance(data,list):data=[]
                elif q.get('type')==['count']:data['data']=[0]
                elif isinstance(data.get('data'),dict):data['data'].update(count=0,data=[],totalPages=0)
            elif self.provider=='twikoo':
                if payload.get('event')=='GET_COMMENTS_COUNT':data={'data':[{'url':v,'count':0} for v in payload.get('urls',[])]}
                elif payload.get('event') in ['GET_RECENT_COMMENTS','COMMENT_GET']:data={'data':[],'count':0}
            elif self.provider=='artalk':
                if '/stats/latest_comments' in u.path:data={'data':[]}
                elif '/stats/page_comment' in u.path:data={'data':{key:0}}
                elif u.path.endswith('/comments'):data={**data,'comments':[],'count':0,'roots_count':0}
            else:data={'count':0} if u.path.endswith('/count') else []
        route.fulfill(body=json.dumps(data,ensure_ascii=False),content_type='application/json',headers={'access-control-allow-origin':'*','access-control-allow-headers':'Content-Type,Authorization'})

def page_ready(page,post=None):
    if post:expect(page.locator('body')).to_have_attribute('data-post-id',post)
    ready(page)

def run(browser,provider,dist,base,screenshots,wallpaper=False):
    server,url=start_server(dist,base);errors=[]
    context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block')
    services=Services(context,provider);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:None)
    try:
        page.goto(url);page_ready(page)
        if wallpaper:page.wait_for_selector('.wallpaper-image.is-visible')
        page.evaluate('window.shell={wall:document.querySelector(".site-wallpaper"),image:document.querySelector(".wallpaper-image"),side:document.querySelector("[data-site-sidebar]"),origin:performance.timeOrigin}')
        assert not services.sdk and not services.calls,'Home must not eagerly load a comment SDK/API'
        page.locator('.post-title a[data-post=welcome]').click();page.wait_for_url(url+'posts/welcome/');page_ready(page,'welcome')
        assert page.locator('.comment-frame').count()==0,'Article starts lazily'
        page.locator('#comments').scroll_into_view_if_needed()
        expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready',timeout=30000)
        expect(page.locator('[data-comment-count]')).to_have_text('3 条' if provider=='giscus' else '1 条',timeout=15000)
        assert page.locator('[data-comments-mount] > iframe').count()==(0 if provider=='custom' else 1)
        if provider!='custom':
            child=page.frame_locator('[data-comments-mount] > iframe')
            if provider!='giscus':expect(child.locator('body')).to_contain_text('来自独立服务的留言',timeout=15000)
            editor=child.locator('textarea:visible').first
            if provider!='giscus' and editor.count():editor.fill('尚未发送的草稿')
            page.evaluate('NekomiTheme.setMode("dark")')
            expect(child.locator('html')).to_have_attribute('data-theme','dark')
            if screenshots:capture(page,provider,'desktop-dark')
            page.evaluate('NekomiTheme.setMode("light")')
            expect(child.locator('html')).to_have_attribute('data-theme','light')
            if provider!='giscus' and editor.count():expect(editor).to_have_value('尚未发送的草稿')
        if provider=='custom':
            page.evaluate('NekomiTheme.setMode("dark")');expect(page.locator('.custom-comment-list')).to_have_attribute('data-theme','dark')
            if screenshots:capture(page,provider,'desktop-dark')
            page.evaluate('NekomiTheme.setMode("light")');expect(page.locator('.custom-comment-list')).to_have_attribute('data-theme','light')
        if screenshots:capture(page,provider,'desktop-light')
        # No unsolicited SDK submissions, and explicit identity survives theme updates.
        if provider=='twikoo':assert all(c['body'].get('url','/posts/welcome/')=='/posts/welcome/' for c in services.calls if c['body'].get('event')=='COMMENT_GET')
        old=page.locator('[data-comments-mount]').element_handle()
        page.locator('.article-neighbor[data-direction=next]').click();page.wait_for_url(url+'posts/markdown-guide/');page_ready(page,'markdown-guide')
        assert not old.evaluate('e=>e.isConnected')
        for i in range(2):
            page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready',timeout=20000)
            assert page.locator('[data-comments-mount] > iframe').count()==(0 if provider=='custom' else 1)
            page.go_back();page.wait_for_url(url+'posts/welcome/');page_ready(page,'welcome')
            page.go_forward();page.wait_for_url(url+'posts/markdown-guide/');page_ready(page,'markdown-guide')
        page.locator('[data-return-list]').first.click();page.wait_for_url(url+'#recent');page_ready(page)
        assert page.locator('.comment-frame').count()==0
        assert page.evaluate('shell.origin===performance.timeOrigin && shell.wall===document.querySelector(".site-wallpaper") && shell.image===document.querySelector(".wallpaper-image") && shell.side===document.querySelector("[data-site-sidebar]")')
        if provider=='giscus':assert page.locator('#side-desktop-comments').count()==0
        else:
            page.locator('#side-desktop-comments').click()
            expect(page.locator('[data-sidebar=desktop] [data-comments-recent-list] mdui-list-item')).to_have_count(1,timeout=20000)
            text=page.locator('[data-sidebar=desktop] [data-comments-recent-list]').inner_text()
            assert '来自独立服务的留言' in text and page.evaluate('window.xss===undefined')
            href=page.locator('[data-sidebar=desktop] [data-comments-recent-list] mdui-list-item').first.get_attribute('href')
            assert href==base+'posts/welcome/'+('#comment-one' if provider=='custom' else '')
        phone(browser,provider,dist,base,screenshots)
        assert not errors,errors
        assert not services.tracking,services.tracking
        print('PASS real SDK comments:',provider,base,'lazy mount, count, theme, history, destruction, sidebar capability, safe text, mobile',flush=True)
    except:
        (dist.parent/'requests.json').write_text(json.dumps(services.calls,ensure_ascii=False,indent=2));page.screenshot(path=str(dist.parent/'failure.png'));raise
    finally:context.close();server.shutdown();server.server_close()


def phone(browser,provider,dist,base,screenshots):
    server,url=start_server(dist,base)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block',user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36')
    services=Services(context,provider);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        page.goto(url+'posts/welcome/');page_ready(page,'welcome');page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready',timeout=15000)
        page.evaluate('NekomiTheme.setMode("dark")');page.wait_for_timeout(350);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if screenshots:capture(page,provider,'mobile-dark')
        page.evaluate('NekomiTheme.setMode("light")');page.wait_for_timeout(350)
        if screenshots:capture(page,provider,'mobile-light')
        page.locator('#menu-button').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',True)
        if provider!='giscus':
            page.locator('#side-mobile-comments').click();expect(page.locator('[data-sidebar=mobile] [data-comments-recent-list] mdui-list-item')).to_have_count(1,timeout=15000)
        page.locator('#drawer-close').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',False)
        for width in (390,320):
            page.set_viewport_size({'width':width,'height':700});page.wait_for_timeout(250)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(provider,width,'page overflow')
            for frame in page.frames[1:]:
                if frame.frame_element().is_visible():
                    assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(provider,width,'embedded overflow')
        assert not errors,errors
    finally:context.close();server.shutdown();server.server_close()


def stress(browser,provider,dist,base):
    server,url=start_server(dist,base);context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block');services=Services(context,provider);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        if provider!='custom':
            services.fail_sdk=True;page.goto(url+'posts/welcome/');page_ready(page,'welcome');page.locator('#comments').scroll_into_view_if_needed()
            expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','error',timeout=15000)
            assert page.locator('.comment-frame').count()==0
            services.fail_sdk=False;page.locator('[data-comment-retry]').click();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready',timeout=15000)
        if provider!='giscus':
            page.goto(url);page_ready(page);services.fail=True;page.locator('#side-desktop-comments').click()
            expect(page.locator('[data-sidebar=desktop] [data-comments-recent-retry]')).to_be_visible(timeout=15000)
            services.fail=False;page.locator('[data-sidebar=desktop] [data-comments-recent-retry]').click()
            expect(page.locator('[data-sidebar=desktop] [data-comments-recent-list] mdui-list-item')).to_have_count(1,timeout=15000)
            # Cancel a slow global query when switching away. Late data must not mutate the new selection.
            page.goto(url);page_ready(page);services.block=True;page.locator('#side-desktop-comments').click()
            page.wait_for_timeout(400);assert services.hold
            page.locator('#side-desktop-updates').click();services.block=False
            pending=services.hold[:];services.hold.clear()
            for route in pending:
                try:route.fulfill(body='[]',content_type='application/json',headers={'access-control-allow-origin':'*'})
                except:pass
            page.locator('#side-desktop-comments').click();expect(page.locator('[data-sidebar=desktop] [data-comments-recent-list] mdui-list-item')).to_have_count(1,timeout=15000)
            # Leave while the current article's widget/API is waiting; destroy old contexts before swap.
            page.goto(url+'posts/welcome/');page_ready(page,'welcome');services.block=True;page.locator('#comments').scroll_into_view_if_needed();page.wait_for_timeout(450)
            assert services.hold
            old=page.locator('[data-comments-mount]').element_handle();services.block=False
            page.locator('.article-neighbor[data-direction=next]').click();page.wait_for_url(url+'posts/markdown-guide/');page_ready(page,'markdown-guide');assert not old.evaluate('e=>e.isConnected')
            page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready',timeout=15000)
            expect(page.locator('[data-comment-count]')).to_have_text('1 条',timeout=15000)
            pending=services.hold[:];services.hold.clear()
            for route in pending:
                try:route.fulfill(body=json.dumps({'errno':0,'data':[99]}),content_type='application/json',headers={'access-control-allow-origin':'*'})
                except:pass
            page.wait_for_timeout(250);expect(page.locator('[data-comment-count]')).to_have_text('1 条')
        services.empty=True;services.fail=False;services.block=False;page.goto(url+'posts/welcome/');page_ready(page,'welcome');page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready',timeout=15000)
        if provider=='giscus':expect(page.locator('[data-comment-count]')).to_be_hidden()
        else:expect(page.locator('[data-comment-count]')).to_have_text('0 条',timeout=15000)
        assert not errors,errors
        print('PASS failure/cancellation:',provider,base,'SDK failure/retry, slow request cancellation, late count protection, no old frames/errors',flush=True)
    except:
        (dist.parent/'stress-requests.json').write_text(json.dumps(services.calls,ensure_ascii=False,indent=2));page.screenshot(path=str(dist.parent/'stress-failure.png'));raise
    finally:context.close();server.shutdown();server.server_close()

def capture(page,provider,label):
    page.evaluate("scrollTo({top:scrollY+document.querySelector('#comments').getBoundingClientRect().top-84,behavior:'instant'})")
    page.wait_for_timeout(700)
    page.screenshot(path=str(ROOT/f'screenshots/p25-comments-{provider}-{label}.png'))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--providers',default='waline,twikoo,giscus,artalk,custom');parser.add_argument('--base',default='/');parser.add_argument('--screenshots',action='store_true');parser.add_argument('--wallpaper',action='store_true');parser.add_argument('--stress',action='store_true');args=parser.parse_args()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        for provider in args.providers.split(','):
            dist=build('comments-'+provider+('-base' if args.base!='/' else ''),config(provider,args.base,args.wallpaper),base=args.base)
            run(browser,provider,dist,args.base,args.screenshots,args.wallpaper)
            if args.stress:stress(browser,provider,dist,args.base)
        browser.close()
if __name__=='__main__':main()
