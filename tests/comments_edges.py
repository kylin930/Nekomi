"""Comment settings, stable identities, empty/disabled states, custom lifetime boundaries."""
import json,os,shutil,subprocess,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from comments_audit import ROOT,Services,config,page_ready
from browser_audit import start_server
from theme_audit import build,ARTIFACTS

def make_posts(name,changes=None):
    path=ARTIFACTS/name;path.mkdir(parents=True,exist_ok=True)
    for source in (ROOT/'src/content/posts').glob('*.md'):
        text=source.read_text()
        if changes and source.stem in changes:text=text.replace('demo: true','demo: true\n'+changes[source.stem],1)
        (path/source.name).write_text(text)
    return path

def browse(browser,dist,base,provider,check):
    server,url=start_server(dist,base);context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block');services=Services(context,provider);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:check(page,services,url);assert not errors,errors
    finally:context.close();server.shutdown();server.server_close()

def disabled(page,services,url):
    requests=[];page.on('request',lambda request:requests.append(request.url))
    page.goto(url+'posts/welcome/');page_ready(page,'welcome');assert page.locator('#comments').count()==0
    page.wait_for_timeout(300);assert not services.sdk and not services.calls
    assert page.locator('#side-desktop-comments').count()==0
    assert page.locator('mdui-button[href="https://comments.example/discussion"]').count()==0
    assert not any('/controller.' in request or '/frame-client.' in request or '/__nekomi/comments/' in request for request in requests)

def closed_post(page,services,url):
    page.goto(url+'posts/welcome/');page_ready(page,'welcome');assert page.locator('#comments').count()==0
    assert not services.sdk and not services.calls
    page.locator('#side-desktop-comments').click();expect(page.locator('[data-sidebar=desktop] [data-comments-recent-status]')).to_have_text('暂时没有可显示的留言。')
    assert not services.sdk and page.locator('[data-comments-recent-list] mdui-list-item').count()==0

def empty(page,services,url):
    page.goto(url);page_ready(page);expect(page.locator('[data-content-empty]')).to_be_visible()
    assert not services.sdk and not services.calls
    page.locator('#side-desktop-comments').click();expect(page.locator('[data-sidebar=desktop] [data-comments-recent-status]')).to_have_text('暂时没有可显示的留言。')
    assert page.locator('.comment-frame').count()==0

def stable(page,services,url):
    services.recent_key='/posts/permanent-thread/'
    page.goto(url+'posts/welcome/');page_ready(page,'welcome');page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready')
    assert any('key=%2Fposts%2Fpermanent-thread%2F' in call['url'] for call in services.calls)
    # Hash deep links trigger lazy mounting and locate only for a capable custom adapter.
    page.goto(url+'posts/welcome/#comment-one');page_ready(page,'welcome');expect(page.locator('#comment-one')).to_be_focused(timeout=10000)
    page.locator('[data-return-list]').first.click();page.wait_for_url(url+'#recent');page_ready(page)
    page.locator('#side-desktop-comments').click();item=page.locator('[data-sidebar=desktop] [data-comments-recent-list] mdui-list-item');expect(item).to_have_count(1)
    assert item.get_attribute('href')=='/Nekomi/posts/welcome/#comment-one'
    page.locator('.post-title a[data-post=welcome]').click();page.wait_for_url(url+'posts/welcome/');page_ready(page,'welcome')
    page.locator('[data-sidebar=desktop] [data-comments-recent-list] mdui-list-item').click();page.wait_for_url(url+'posts/welcome/#comment-one');expect(page.locator('#comment-one')).to_be_focused(timeout=10000)
    page.locator('[data-return-list]').first.click();page.wait_for_url(url+'#recent');page_ready(page)
    page.goto(url+'posts/markdown-guide/');page_ready(page,'markdown-guide');page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready')
    assert any('key=%2Flegacy%2Fthread.html' in call['url'] for call in services.calls)

def no_recent(page,services,url):
    page.goto(url);page_ready(page);page.locator('#side-desktop-comments').click();expect(page.locator('[data-sidebar=desktop] [data-comments-recent-status]')).to_have_text('此评论服务不提供最新评论。')
    assert not services.sdk and not services.calls
    page.locator('.post-title a[data-post=welcome]').click();page.wait_for_url(url+'posts/welcome/');page_ready(page,'welcome');page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready')
    expect(page.locator('[data-comment-count]')).to_be_hidden()

def late(page,services,url):
    page.goto(url+'posts/welcome/');page_ready(page,'welcome');page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','error',timeout=6000)
    page.locator('[data-comment-retry]').click();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','loading')
    page.wait_for_function('window.lateDestroyed===1',timeout=3000)
    assert page.locator('[data-late]').count()==0
    expect(page.locator('[data-comment-count]')).to_be_hidden()
    page.locator('[data-return-list]').first.click();page.wait_for_url(url+'#recent');page_ready(page)
    page.wait_for_function('window.lateDestroyed===2',timeout=6000)
    assert page.locator('[data-late]').count()==0 and page.locator('.comment-frame').count()==0

def counts_off(page,services,url):
    page.goto(url+'posts/welcome/');page_ready(page,'welcome');page.locator('#comments').scroll_into_view_if_needed();expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready',timeout=15000)
    page.wait_for_timeout(300);expect(page.locator('[data-comment-count]')).to_be_hidden()
    assert not any('type=count' in call['url'] or call['body'].get('event')=='GET_COMMENTS_COUNT' for call in services.calls)
    assert page.locator('#side-desktop-comments').count()==0



def runtime_failure(page,services,url):
    pattern='**/_astro/controller.*.js'
    page.context.route(pattern,lambda route:route.fulfill(status=503,body='offline'))
    page.goto(url+'posts/welcome/');page_ready(page,'welcome')
    expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','error')
    expect(page.locator('[data-comment-retry]')).to_have_text('刷新后重试')
    page.evaluate('NekomiTheme.setMode("light")')
    page.locator('[data-theme-cycle]:visible').first.click()
    expect(page.locator('html')).to_have_class(re.compile(r'\bmdui-theme-dark\b'))
    page.locator('[data-return-list]').first.click();page.wait_for_url(url+'#recent');page_ready(page)
    page.locator('[data-sidebar=desktop] [data-search]').locator('input').fill('排版')
    expect(page.locator('.post-card:visible')).to_have_count(1)
    page.locator('.post-title a[data-post=markdown-guide]').click();page.wait_for_url(url+'posts/markdown-guide/');page_ready(page,'markdown-guide')
    page.context.unroute(pattern)
    page.locator('[data-comment-retry]').click();page_ready(page,'markdown-guide')
    page.locator('#comments').scroll_into_view_if_needed()
    expect(page.locator('[data-comments-section]')).to_have_attribute('data-state','ready')


def main():
    ARTIFACTS.mkdir(parents=True,exist_ok=True)
    modules=ARTIFACTS/'edge-modules';modules.mkdir(exist_ok=True)
    no=modules/'no-recent.mjs';no.write_text("export default ()=>({id:'none-query',capabilities:{theme:true,count:false,recent:false,locate:false},async mount(c){c.onCount(9);const p=document.createElement('p');p.textContent='自建组件';c.container.append(p);return{setTheme(){},destroy(){p.remove()}}}})")
    delayed=modules/'late.mjs';delayed.write_text("export default ()=>({id:'late',capabilities:{theme:true,count:false,recent:false,locate:false},async mount(c){await new Promise(r=>setTimeout(r,4500));const p=document.createElement('p');p.dataset.late='';p.textContent='不应出现的迟到结果';c.container.append(p);c.onCount(999);return{setTheme(){},destroy(){p.remove();window.lateDestroyed=(window.lateDestroyed||0)+1}}}})")
    none=config('waline');none['comments']['provider']='none'
    falseposts=make_posts('closed-posts',{'welcome':'comments: false\ncommentsUrl: https://comments.example/discussion'})
    zeroposts=ARTIFACTS/'zero-comments-posts';zeroposts.mkdir(exist_ok=True)
    stableposts=make_posts('stable-posts',{'welcome':'commentId: permanent-thread','markdown-guide':'commentPath: /legacy/thread.html'})
    welcome=stableposts/'welcome.md';welcome.write_text(welcome.read_text()+'\n\n## 评论相关配置 {#comment-settings}\n\n临时回归：普通文章标题不能被评论锚点处理接管。\n')
    unsupported=config('custom');unsupported['comments']['custom']['module']='./'+str(no.relative_to(ROOT))
    slow=config('custom');slow['comments']['timeout']=3000;slow['comments']['custom']['module']='./'+str(delayed.relative_to(ROOT))
    closed_link=config('custom');closed_link['comments'].update(provider='link',items=[{'id':'one','author':'示例读者','excerpt':'仅用于关闭状态回归','postId':'welcome','createdAt':'2026-01-03T00:00:00Z','demo':True}])
    no_counts=config('twikoo');no_counts['comments'].update(counts=False,recent=False)
    cases=[('link-closed',closed_link,falseposts,'/',disabled),('runtime-failure',config('custom'),None,'/',runtime_failure),('counts-off',no_counts,None,'/',counts_off),('off',none,None,'/',disabled),('closed',config('waline'),falseposts,'/',closed_post),('zero',config('waline'),zeroposts,'/',empty),('stable',config('custom'),stableposts,'/Nekomi/',stable),('capabilities',unsupported,None,'/',no_recent),('late',slow,None,'/',late)]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        for name,settings,posts,base,check in cases:
            settings['appearance']['wallpaper']['enabled']=False
            dist=build('comments-edge-'+name,settings,posts,base)
            browse(browser,dist,base,settings['comments']['provider'],check)
            print('PASS comment boundary:',name,flush=True)
        browser.close()
    # The SDK bridge is an implementation document, never an SEO article.
    published=make_posts('comments-published-posts')
    welcome=published/'welcome.md';welcome.write_text(welcome.read_text().replace('demo: true','demo: false'))
    settings=config('waline');settings['demo']=False;settings['publishing']={'url':'https://blog.example','base':'/','indexing':True}
    dist=build('comments-seo',settings,published,'/')
    bridge=(dist/'__nekomi/comments/index.html').read_text()
    assert 'name="robots" content="noindex, nofollow"' in bridge
    sitemap=''.join(path.read_text() for path in dist.glob('sitemap*.xml'))
    assert '/posts/welcome/' in sitemap and '__nekomi' not in sitemap
    assert '__nekomi' not in (dist/'rss.xml').read_text()
    print('PASS comment bridge: noindex, excluded from Sitemap / RSS',flush=True)
    # Clear build errors for accidental identity collisions and an invalid custom module.
    duplicates=make_posts('duplicate-comment-posts',{'welcome':'commentId: duplicate','markdown-guide':'commentId: duplicate'})
    for name,c,posts,message in [('duplicates',none,duplicates,'Duplicate comment identity'),('module',{**unsupported,'comments':{**unsupported['comments'],'custom':{'module':'./src/custom/not-present.ts'}}},None,'comments.custom.module')]:
        folder=ARTIFACTS/('invalid-'+name);folder.mkdir(exist_ok=True);file=folder/'site.json';file.write_text(json.dumps(c));env={**os.environ,'NEKOMI_CONFIG':str(file),'ASTRO_TELEMETRY_DISABLED':'1','ASTRO_OUT_DIR':str(folder/'dist'),'ASTRO_CACHE_DIR':str(folder/'cache')}
        if posts:env['NEKOMI_CONTENT_DIR']=str(posts)
        result=subprocess.run(['npm','run','build'],cwd=ROOT,env=env,capture_output=True,text=True);assert result.returncode and message in result.stdout+result.stderr
        print('PASS expected validation failure:',name,flush=True)
if __name__=='__main__':main()
