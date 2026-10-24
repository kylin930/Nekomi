"""P2.4 static SEO, pagination, race and list-history regression.

Large collections exist only in a temporary build; no authored posts are changed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import date,timedelta
from urllib.parse import urljoin,urlsplit,unquote,quote
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright,expect
from browser_audit import ROOT,start_server,ready as enhanced


def ready(page):
    # popstate changes the URL before Astro fetches/swaps the destination.
    # Do not mistake the previous page's enhanced flag for the new page.
    expect(page.locator('body')).to_have_attribute('data-page','article' if '/posts/' in urlsplit(page.url).path else 'home')
    enhanced(page)


def follow(page,locator):
    target=urljoin(page.url,locator.get_attribute('href'))
    locator.click();page.wait_for_url(target);ready(page)


def external_routes(context,cache,wallpaper=None):
    cache=Path(cache);cache.mkdir(parents=True,exist_ok=True)
    def font(route):
        key=cache/hashlib.sha256(route.request.url.encode()).hexdigest();meta=key.with_suffix('.type')
        if not key.exists() or not meta.exists():
            result=subprocess.run(['curl','-fLsS','--compressed','--max-time','45','--user-agent',route.request.headers.get('user-agent',''),'--output',str(key),'--write-out','%{content_type}',route.request.url],check=True,capture_output=True,text=True)
            meta.write_text(result.stdout)
        route.fulfill(body=key.read_bytes(),content_type=meta.read_text(),headers={'access-control-allow-origin':'*'})
    context.route('https://fonts.googleapis.com/**',font);context.route('https://fonts.gstatic.com/**',font)
    context.route('https://www.nekopara.uk/pic_api',lambda route:route.fulfill(body=(wallpaper or ROOT/'src/assets/images/demo-home.png').read_bytes(),content_type='image/png'))


def build_fixture(directory,base='/'):
    posts=directory/'posts';shutil.copytree(ROOT/'examples/demo-posts',posts)
    config=json.loads((ROOT/'examples/personal/site.config.json').read_text());config['demo']=False
    config['publishing'].update(url='https://nekomi.example',indexing=True,pageSize=6)
    for index in range(32):
        meta={'title':f'分页回归条目 {index+1:02d}','excerpt':'远页索引词' if index==0 else '用于独立临时构建的浏览与 SEO 回归数据。',
              'date':str(date(2026,11,1)+timedelta(days=index)), 'category':'分组 A' if index%2 else '分组 B', 'tags':['分页',f'主题 {index%3}'], 'demo':False}
        if index==31:meta.update(updated='2026-12-03',cover='images/demo-home.png',coverAlt='项目首页截图')
        (posts/f'fixture-{index+1:02d}.md').write_text('---\n'+json.dumps(meta,ensure_ascii=False)+'\n---\n\n这是一篇只存在于临时构建的测试文章。\n\n## 第一节 {#first}\n\n'+('段落用于确认文章和列表采用同一套阅读样式。\n\n'*8)+'## 第二节 {#second}\n\n```js\nconst page = 2;\n```\n')
    config_file=directory/'site.json';config_file.write_text(json.dumps(config,ensure_ascii=False))
    dist=directory/'dist'
    env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1','SITE_BASE':base,'SITE_URL':'https://nekomi.example','NEKOMI_CONFIG':str(config_file),'NEKOMI_CONTENT_DIR':str(posts),'ASTRO_OUT_DIR':str(dist),'ASTRO_CACHE_DIR':str(directory/'cache')}
    result=subprocess.run(['npm','run','build'],cwd=ROOT,env=env,capture_output=True,text=True)
    (directory/'build.log').write_text(result.stdout+result.stderr)
    assert result.returncode==0,result.stdout+result.stderr
    return dist


def seo_checks(page,url,base,dist,configured=False):
    for path in ('','page/2/','categories/','tags/','archive/','posts/css-grid-two-column-blog/'):
        page.goto(url+path,wait_until='networkidle');ready(page)
        assert page.locator('head title').count()==1
        assert page.locator('meta[name=description]').get_attribute('content')
        assert page.locator('meta[property="og:title"]').get_attribute('content')==page.title()
        assert page.locator('meta[name="twitter:card"]').get_attribute('content') in ('summary','summary_large_image')
        assert page.locator('link[rel=alternate][type="application/rss+xml"]').get_attribute('href')==base+'rss.xml'
        graph=json.loads(page.locator('script[type="application/ld+json"]').text_content())['@graph']
        assert {'WebSite','Blog'} <= {item['@type'] for item in graph}
        assert all(item['@type']!='BlogPosting' for item in graph), 'Shipped sample articles must not become factual BlogPosting data'
        if configured:
            expect(page.locator('link[rel=canonical]')).to_have_attribute('href','https://nekomi.example'+base+path)
        else:
            expect(page.locator('link[rel=canonical]')).to_have_count(0)
            assert page.locator('meta[name=robots]').get_attribute('content')=='noindex, follow'
    rss=ET.fromstring((dist/'rss.xml').read_text())
    items=rss.findall('./channel/item')
    robots=(dist/'robots.txt').read_text()
    if not configured:
        assert not items and 'Sitemap:' not in robots
        assert not list(dist.glob('sitemap*.xml'))
    else:
        assert len(items)==32
        assert all('/posts/fixture-' in item.findtext('link') for item in items)
        assert all(item.findtext('link').startswith('https://nekomi.example'+base) for item in items)
        index=ET.fromstring((dist/'sitemap-index.xml').read_text())
        namespace={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
        addresses=[];lastmods={}
        for loc in index.findall('.//s:loc',namespace):
            path=unquote(urlsplit(loc.text).path)[len(base):]
            entries=ET.fromstring((dist/path).read_text()).findall('s:url',namespace)
            addresses += [entry.findtext('s:loc',namespaces=namespace) for entry in entries]
            lastmods.update({entry.findtext('s:loc',namespaces=namespace):entry.findtext('s:lastmod',namespaces=namespace) for entry in entries})
        assert addresses and all(value.startswith('https://nekomi.example'+base) for value in addresses)
        assert all('/posts/' not in value or '/posts/fixture-' in value for value in addresses)
        assert 'https://nekomi.example'+base+'page/2/' in addresses
        assert 'https://nekomi.example'+base+'page/7/' not in addresses, 'Demo-only pagination must also be noindex'
        assert lastmods['https://nekomi.example'+base+'posts/fixture-32/'].startswith('2026-12-03')
        assert lastmods['https://nekomi.example'+base+'posts/fixture-31/'] is None
        assert 'Sitemap: https://nekomi.example'+base+'sitemap-index.xml' in robots
        page.goto(url+'posts/fixture-32/');ready(page)
        article=[item for item in json.loads(page.locator('script[type="application/ld+json"]').text_content())['@graph'] if item['@type']=='BlogPosting'][0]
        assert article['dateModified']=='2026-12-03' and article['datePublished']=='2026-12-02'
        assert article['mainEntityOfPage']=='https://nekomi.example'+base+'posts/fixture-32/'
        assert page.locator('meta[property="og:image"]').get_attribute('content').startswith('https://nekomi.example'+base+'_astro/')
        page.goto(url+'posts/fixture-31/');ready(page)
        article=[item for item in json.loads(page.locator('script[type="application/ld+json"]').text_content())['@graph'] if item['@type']=='BlogPosting'][0]
        assert 'dateModified' not in article
        expect(page.locator('meta[property="og:image"]')).to_have_count(0)
    print('PASS SEO:',base,'canonical/OG/X/JSON-LD, optional images/dates, consistent demo noindex + official Sitemap/RSS/Robots',flush=True)


def history_checks(page,url):
    page.goto(url,wait_until='networkidle');ready(page);page.wait_for_timeout(700)
    assert page.locator('.post-card').count()==6
    page.evaluate('window.originalWallpaper=document.querySelector(".site-wallpaper");window.originalSidebar=document.querySelector(".sidebar");window.originalOrigin=performance.timeOrigin')
    page.locator('#post-list .post-title a').nth(5).scroll_into_view_if_needed()
    page.wait_for_function('document.querySelectorAll(".post-card").length>=12')
    page.wait_for_timeout(300)
    y=page.evaluate('scrollY');count=page.locator('.post-card').count()
    target=urljoin(page.url,page.locator('#post-list .post-title a').nth(5).get_attribute('href'))
    follow(page,page.locator('#post-list .post-title a').nth(5))
    assert page.evaluate('scrollY')==0
    page.evaluate('''() => { window.returnFrames=[];document.addEventListener('astro:after-swap',()=>{let n=0;function frame(){returnFrames.push(scrollY);if(++n<5)requestAnimationFrame(frame)}requestAnimationFrame(frame)},{once:true}) }''')
    page.go_back();page.wait_for_url(url+'#recent');ready(page);page.wait_for_timeout(700)
    assert abs(page.evaluate('scrollY')-y)<=2,('back scroll',y,page.evaluate('scrollY'),page.evaluate('history.state'))
    assert page.locator('.post-card').count()==count
    assert all(abs(value-y)<=2 for value in page.evaluate('returnFrames')),('restoration flash',page.evaluate('returnFrames'),y)
    page.go_forward();page.wait_for_url(target);ready(page);page.wait_for_timeout(550)
    follow(page,page.locator('[data-direction=next]'));page.wait_for_timeout(550)
    # A chapter creates another real history entry. Return must skip it too.
    if page.locator('#toc-desktop-list').is_visible():page.locator('#toc-desktop-list mdui-list-item').last.click()
    else:
        page.locator('#toc-toggle').click();page.locator('#toc-inline-list mdui-list-item').last.click()
    page.wait_for_url('**#second')
    expect(page.locator('#second')).to_be_focused()
    page.wait_for_function('!NekomiMotion.isScrolling()')
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(url+'#recent');ready(page);page.wait_for_timeout(650)
    assert page.url==url+'#recent' and abs(page.evaluate('scrollY')-y)<=2
    assert page.locator('.post-card').count()==count
    assert page.evaluate('originalWallpaper===document.querySelector(".site-wallpaper")&&originalSidebar===document.querySelector(".sidebar")&&originalOrigin===performance.timeOrigin')
    # A directly opened article has no list-origin shortcut.
    page.goto(url+'posts/fixture-31/');ready(page)
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(url+'#recent');ready(page)
    assert page.url==url+'#recent' and page.evaluate('scrollY')==0
    print('PASS history:',url,'loaded batches + exact native scroll/first frames, forward/back, multi-article + hash return, direct-open fallback, persistent shell',flush=True)


def search_and_facets(page,url):
    page.goto(url);ready(page)
    field=page.locator('.sidebar [data-search] input' if page.viewport_size['width']>=1120 else '#mobile-drawer [data-search] input')
    if page.viewport_size['width']<1120:page.locator('#menu-button').click()
    field.fill('远页索引词')
    expect(page.locator('#post-list .post-card')).to_have_count(1)
    expect(page.locator('#feed-summary')).to_contain_text('找到 1 篇文章')
    expect(page.locator('#post-list .post-title a')).to_have_text('分页回归条目 01')
    if page.viewport_size['width']<1120:page.locator('#drawer-close').click()
    search_url=page.url
    follow(page,page.locator('#post-list .post-title a'))
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(search_url);ready(page)
    assert 'q=' in page.url
    expect(page.locator('#post-list .post-card')).to_have_count(1)
    expect(page.locator('#post-list mark')).not_to_have_count(0)
    page.locator('[data-clear-search]').first.click()
    page.locator('#tab-categories').click();page.wait_for_timeout(400)
    tab_url=page.url
    follow(page,page.locator('#categories-list mdui-list-item').first)
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(tab_url);ready(page)
    expect(page.locator('#panel-categories')).to_be_visible()
    category=page.locator('#categories-list h2 a').first
    follow(page,category)
    assert '/categories/' in page.url
    expect(page.locator('#feed-summary')).to_contain_text('分类')
    facet_url=page.url
    follow(page,page.locator('#post-list .post-title a').first)
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(facet_url);ready(page)
    assert '/categories/' in page.url
    page.goto(url+'tags/');ready(page)
    follow(page,page.locator('#tags-list mdui-chip').first)
    assert '/tags/' in page.url
    facet_url=page.url
    follow(page,page.locator('#post-list .post-title a').first)
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(facet_url);ready(page)
    assert '/tags/' in page.url
    # Reader search must wait for a remote-page result before focusing it.
    page.goto(url+'posts/fixture-31/');ready(page)
    if page.viewport_size['width']<1120:page.locator('#menu-button').click()
    field.fill('远页索引词');field.press('Enter')
    page.wait_for_url(url+'?q='+quote('远页索引词')+'#recent');ready(page)
    expect(page.locator('#post-list .post-title a')).to_have_text('分页回归条目 01')
    expect(page.locator('#post-list .post-title a')).to_be_focused()
    print('PASS discovery:',url,'global remote-page search + highlight/return/clear, async reader search focus and static category/tag return',flush=True)



def loading_checks(browser,url,cache):
    def fresh():
        context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block')
        external_routes(context,cache);page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        return context,page,errors
    context,page,errors=fresh();pending=[];calls=[]
    def hold(route):calls.append(route.request.url);pending.append(route)
    context.route(url+'page/2/',hold)
    page.goto(url);ready(page);page.wait_for_timeout(700)
    assert page.locator('.post-card').count()==6 and not calls
    with page.expect_request(url+'page/2/'):
        page.evaluate('scrollTo(0,document.documentElement.scrollHeight)')
    page.wait_for_timeout(80)
    for _ in range(3):page.evaluate('scrollTo(0,document.documentElement.scrollHeight)')
    page.wait_for_timeout(150)
    assert len(calls)==1 and page.locator('.post-card').count()==6
    pending.pop().fulfill(status=503,body='unavailable')
    expect(page.locator('#load-more')).to_have_text('重试加载')
    page.wait_for_timeout(300);assert len(calls)==1,'Failures must not retry in an automatic loop'
    context.unroute(url+'page/2/',hold)
    page.evaluate('window.beforeAppend=scrollY')
    page.locator('#load-more').click()
    expect(page.locator('.post-card')).to_have_count(12)
    expect(page.locator('[data-page-label]')).to_have_text('第 1–2 / 7 页')
    expect(page.locator('#post-list .post-card').nth(6).locator('.post-title a')).to_be_focused()
    assert abs(page.evaluate('scrollY-beforeAppend'))<=2,'Appending below the viewport must not move it'
    assert not errors,errors;context.close()

    context,page,errors=fresh();pending=[]
    context.route(url+'page/6/',lambda route:pending.append(route))
    page.goto(url);ready(page)
    field=page.locator('.sidebar [data-search] input')
    with page.expect_request(url+'page/6/'):field.fill('远页索引词')
    page.wait_for_timeout(40)
    field.fill('分页回归条目 32')
    expect(page.locator('#post-list .post-title a')).to_have_text('分页回归条目 32')
    for route in pending:
        try:route.fulfill(status=503,body='stale response')
        except Exception:pass # The old request may already have been cancelled.
    page.wait_for_timeout(300)
    expect(page.locator('#post-list .post-title a')).to_have_text('分页回归条目 32')
    expect(page.locator('#feed-summary')).to_contain_text('找到 1 篇文章')
    assert not errors,errors;context.close()

    context,page,errors=fresh();pending=[]
    context.route(url+'page/2/',lambda route:pending.append(route))
    page.goto(url);ready(page)
    with page.expect_request(url+'page/2/'):page.evaluate('scrollTo(0,document.documentElement.scrollHeight)')
    follow(page,page.locator('#post-list .post-title a').first)
    expect(page.locator('#reader')).to_be_visible()
    for route in pending:
        try:route.fulfill(status=503,body='stale response')
        except Exception:pass
    assert page.locator('#post-list').count()==0
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(url+'#recent');ready(page)
    assert page.locator('.post-card').count()==6
    assert not errors,errors;context.close()

    context,page,errors=fresh();requests=[]
    context.on('request',lambda request:requests.append(request.url))
    page.goto(url);ready(page);page.wait_for_timeout(500)
    assert not any('/page/' in value for value in requests)
    for expected in range(12,43,6):
        page.evaluate('scrollTo(0,document.documentElement.scrollHeight)')
        expect(page.locator('.post-card')).to_have_count(expected)
    ids=page.locator('.post-card').evaluate_all('es=>es.map(e=>e.dataset.postId)')
    assert len(ids)==len(set(ids))==42
    expect(page.locator('#feed-status')).to_have_text('已经读到最后了')
    expect(page.locator('[data-page-label]')).to_have_text('第 1–7 / 7 页')
    expect(page.locator('[data-page-next]')).to_be_hidden()
    for number in range(2,8):assert requests.count(url+f'page/{number}/')==1
    # Appended native MDUI buttons and ordinary title anchors share Astro's
    # deduplicating hover prefetch, plus the existing shared-title transition.
    from motion_audit import probe,shared,finish
    probe(page)
    link=page.locator('[data-post-id="fixture-08"] .post-title a')
    link.hover();page.wait_for_timeout(200)
    target=urljoin(url,link.get_attribute('href'))
    assert requests.count(target)==1
    follow(page,link);shared(finish(page,1))
    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(url+'#recent');ready(page)
    shared(finish(page,2));assert page.locator('.post-card').count()==42
    assert not errors,errors;context.close()
    print('PASS loading: 42 unique posts, one request/page, no eager fetch; held/503 retry, stable scroll + keyboard focus, stale search/navigation cancellation, appended Prefetch/shared transition',flush=True)


def no_javascript(browser,url,cache):
    context=browser.new_context(java_script_enabled=False,service_workers='block')
    external_routes(context,cache)
    page=context.new_page();target=url;seen=[]
    while target:
        page.goto(target)
        expect(page.locator('#post-list .post-title a').first).to_be_visible()
        seen.extend(page.locator('#post-list .post-title a').evaluate_all('es=>es.map(e=>e.href)'))
        link=page.locator('#feed-pagination a[rel=next]')
        target=link.get_attribute('href') if link.count() else ''
        if target:target=urljoin(url,target)
    assert len(seen)==42 and len(set(seen))==42
    page.goto(url+'tags/');expect(page.locator('noscript a').last).to_be_visible()
    context.close();print('PASS no JavaScript: all 42 posts through seven static pages, standard next/previous links and taxonomy fallbacks',flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,default=ROOT/'dist');parser.add_argument('--base',default='/')
    parser.add_argument('--cdn-cache',type=Path,default=Path('/tmp/nekomi-p11/cdn'))
    parser.add_argument('--fixture',action='store_true');parser.add_argument('--artifacts',type=Path)
    parser.add_argument('--only-seo',action='store_true')
    parser.add_argument('--only-loading',action='store_true')
    args=parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='p24-',dir=ROOT/'.astro') as directory,sync_playwright() as p:
        directory=Path(directory);dist=build_fixture(directory,args.base) if args.fixture else args.dist
        if args.artifacts:args.artifacts.mkdir(parents=True,exist_ok=True)
        server,url=start_server(dist,args.base)
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'} if os.environ.get('HTTPS_PROXY') else None)
        try:
            context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block')
            external_routes(context,args.cdn_cache);page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            seo_checks(page,url,args.base,dist,args.fixture)
            if args.fixture and not args.only_seo:
                if not args.only_loading:
                    for width,height in ((1440,900),(390,844)):
                        page.set_viewport_size({'width':width,'height':height})
                        history_checks(page,url);search_and_facets(page,url)
                loading_checks(browser,url,args.cdn_cache)
                if not args.only_loading:no_javascript(browser,url,args.cdn_cache)
            assert not errors,errors
            context.close()
        except BaseException:
            if args.artifacts and 'page' in locals():
                page.screenshot(path=str(args.artifacts/'failure.png'))
                (args.artifacts/'failure.json').write_text(json.dumps({'url':page.url,'errors':errors,'state':page.evaluate('history.state')},ensure_ascii=False,indent=2))
            raise
        finally:browser.close();server.shutdown();server.server_close()


if __name__=='__main__':main()
