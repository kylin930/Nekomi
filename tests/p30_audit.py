"""P3 default copy, typography, native Tabs shape and social/RSS regression."""
import argparse,json,shutil,re
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from theme_audit import ROOT,build
from browse_audit import ready,external_routes
from browser_audit import start_server

FORBIDDEN=['技术、灵感，还有日常','整理与发现','循着兴趣阅读','沿着时间回望','这里，留给有趣的邻居','这里还很安静','第一篇文章，正在路上','谢谢读到这里','已经读到最后了','分享技术，也记录生活。']

def exercise(browser,name,dist,base,screenshots):
    server,url=start_server(dist,base)
    try:
        for mobile,mode in [(False,'light'),(False,'dark'),(True,'light'),(True,'dark')]:
            context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,service_workers='block')
            external_routes(context,'/tmp/nekomi-p11/cdn');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            requests=[];page.on('request',lambda r:requests.append((r.url,r.resource_type)))
            try:
                page.goto(url,wait_until='networkidle');ready(page);page.evaluate('mode=>NekomiTheme.setMode(mode)',mode);page.wait_for_timeout(700)
                data=json.loads(page.locator('#site-data').text_content());prefix='mobile' if mobile else 'desktop'
                shell=page.evaluate('window.savedShell={side:document.querySelector("[data-site-sidebar]"),wall:document.querySelector(".site-wallpaper"),drawer:document.querySelector("#mobile-drawer"),time:performance.timeOrigin};true')
                shape=page.locator('#content-tabs').evaluate('e=>{let s=getComputedStyle(e.shadowRoot.querySelector("[part=container]"));return [s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius,s.position,s.backdropFilter]}')
                assert shape[:4]==['12px','12px','0px','0px'] and shape[4]=='sticky',shape
                assert page.locator('.view-heading p,.view-heading .eyebrow').count()==0
                assert page.locator('[data-page-label]').count()==0
                assert page.locator('#feed-summary').evaluate('e=>getComputedStyle(e).display')!='none'
                expect(page.locator('#feed-summary')).to_have_class(re.compile(r'\bvisually-hidden\b'));expect(page.locator('#feed-status')).to_be_empty();expect(page.locator('#feed-sentinel')).to_be_hidden();expect(page.locator('#feed-pagination')).to_be_hidden()
                assert not page.locator('.site-footer a[href$="rss.xml"]').count()
                footer=page.locator('.site-footer').inner_text()
                year=datetime.now(timezone.utc).year;since=data['footer']['since'];period=f'{since}–{year}' if since<year else str(since)
                assert footer.strip()==('© 2024–2026 青空·自定义版权说明·标签' if name=='custom' else f'© {period} {data["site"]["name"]}'),footer
                brand=page.locator('[data-sidebar=desktop] .site-name').evaluate('e=>({family:getComputedStyle(e).fontFamily,token:getComputedStyle(e).getPropertyValue("--brand-font").trim(),weight:getComputedStyle(e).fontWeight,tracking:getComputedStyle(e).letterSpacing})')
                assert brand['token']==data['appearance']['brandFont'] and brand['weight']=='650',brand
                if name!='custom':assert 'serif' not in brand['family'].replace('sans-serif','')
                assert page.locator('[data-sidebar=desktop] .site-intro').count()==(1 if name=='custom' else 0)
                if mobile:assert page.locator('mdui-top-app-bar-title').evaluate('e=>getComputedStyle(e).fontFamily')==brand['family']
                def capture(label):
                    if screenshots:
                        page.wait_for_timeout(400);page.screenshot(path=str(ROOT/f'screenshots/p30-{name}-{label}-{mode}-{390 if mobile else 1440}.png'))
                capture('home')
                for tab in ['categories','tags','archive','recent']:
                    page.locator('#tab-'+tab).click();expect(page.locator('#panel-'+tab)).to_be_visible()
                    assert page.locator('#panel-'+tab+' .view-heading').inner_text().strip() in ['文章分类','所有标签','文章归档','全部文章']
                    assert page.locator('.view-heading p').count()==0
                    if name=='default' and not mobile and tab!='recent':capture(tab)
                assert not any(text in page.locator('body').inner_text() for text in FORBIDDEN)
                if name!='quiet':
                    if mobile:page.locator('#menu-button').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',True)
                    field=page.locator(f'[data-sidebar={prefix}] [data-search] input');field.fill('欢迎')
                    if mobile:page.locator('#drawer-close').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',False)
                    expect(page.locator('#feed-summary')).to_be_visible();expect(page.locator('#feed-summary')).to_contain_text('找到 1 篇文章')
                    assert page.locator('#feed-summary').get_attribute('aria-live')=='polite'
                    page.locator('[data-clear-search]').first.click();expect(page.locator('#feed-summary')).to_have_class(re.compile(r'\bvisually-hidden\b'))
                if mobile:page.locator('#menu-button').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',True)
                social=page.locator(f'[data-sidebar={prefix}] .social-links')
                if name=='quiet':assert social.count()==0
                else:
                    assert social.count()==1
                    expect(social.locator(f'mdui-button-icon[href="{base}rss.xml"]')).to_have_count(1)
                    if name=='custom':
                        for icon in ['github','bilibili']:
                            node=social.locator(f'[data-social-icon={icon}] svg');expect(node).to_be_visible();assert node.bounding_box()['width']==24 and node.locator('path').count()==1
                        for platform in ['GitHub','Bilibili','网站','电子邮件']:
                            expect(social.get_by_role('link',name=platform,exact=True)).to_be_visible()
                    if mobile:capture('drawer')
                if mobile:page.locator('#drawer-close').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',False)
                page.locator('.post-title a').first.click();page.wait_for_url(url+'posts/welcome/');ready(page)
                assert page.evaluate('savedShell.side===document.querySelector("[data-site-sidebar]") && savedShell.wall===document.querySelector(".site-wallpaper") && savedShell.drawer===document.querySelector("#mobile-drawer") && savedShell.time===performance.timeOrigin')
                assert not page.locator('.reader-endnote').count()
                assert page.locator('#article-title').evaluate('e=>getComputedStyle(e).getPropertyValue("--identity-font").trim()')==data['appearance']['headingFont']
                assert not any(text in page.locator('body').inner_text() for text in FORBIDDEN)
                if name=='default':capture('reader')
                page.locator('[data-return-list]').first.click();page.wait_for_url(url+'#recent');ready(page);expect(page.locator('#feed-summary')).to_have_class(re.compile(r'\bvisually-hidden\b'))
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                assert not any('font' in u and 'Material' not in u and 'fonts.gstatic.com' not in u for u,t in requests if t=='stylesheet' and u.startswith('https://'))
                if name!='quiet':
                    if mobile:page.locator('#menu-button').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',True)
                    before=len(requests);page.locator(f'[data-sidebar={prefix}] .social-links mdui-button-icon[href="{base}rss.xml"]').click();page.wait_for_url(url+'rss.xml')
                    assert page.evaluate('document.contentType') in ['application/rss+xml','application/xml','text/xml']
                    rss=[(u,t) for u,t in requests[before:] if u==url+'rss.xml'];assert rss==[(url+'rss.xml','document')],rss
                assert not errors,errors
            finally:context.close()
        print('PASS P3:',name,'four Tabs/title-only, two top corners, brand font, social/RSS, footer, search, reader/navigation, desktop/mobile light/dark',flush=True)
    finally:server.shutdown();server.server_close()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--profiles',default='default,fresh,minimal,custom,quiet');parser.add_argument('--screenshots',action='store_true');args=parser.parse_args()
    starter=json.loads((ROOT/'site.config.json').read_text())
    profiles={}
    for preset in ['default','fresh','minimal']:
        c=json.loads(json.dumps(starter));c['appearance']['preset']=preset;profiles[preset]=(c,'/')
    custom=json.loads(json.dumps(starter));custom['site'].update(name='青空 Aozora',intro='前端笔记。',social=[{'name':'GitHub','url':'https://github.com/'},{'name':'Bilibili','url':'https://www.bilibili.com/'},{'name':'网站','url':'https://blog.example/'},{'name':'订阅','url':'/rss.xml'}],email='hello@example.test')
    custom['appearance']['brandFont']='Verdana, "PingFang SC", sans-serif';custom['home']={'eyebrow':'旧配置兼容文字','description':'自定义首页 SEO 描述'};custom['footer']={'copyright':'© 2024–2026 青空','text':'自定义版权说明','links':[{'label':'标签','url':'/tags/'}]};profiles['custom']=(custom,'/Nekomi/')
    quiet=json.loads(json.dumps(starter));quiet['features']={'rss':False,'search':False};profiles['quiet']=(quiet,'/')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        for name in args.profiles.split(','):
            config,base=profiles[name];dist=build('p30-'+name,config,base=base);exercise(browser,name,dist,base,args.screenshots)
        browser.close()
if __name__=='__main__':main()
