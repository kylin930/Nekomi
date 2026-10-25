"""Three real configurations and temporary content; no published articles change."""
import argparse, json, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_audit import ROOT, start_server, ready
from browse_audit import external_routes
from theme_audit import ARTIFACTS, build


def fixtures(name, category, english):
    folder=ARTIFACTS/('personalization-posts-'+name);folder.mkdir(parents=True,exist_ok=True)
    body='''A long-form reference for this temporary browser check.

## First section

Body text with **emphasis**, a [reference](https://example.com/) and a list.

- One
- Two

```js
console.log('portable theme');
```

:::note
Markdown inside a theme-owned callout.
:::

:::details
Additional information.
:::

## Second section

| Name | Value |
| --- | --- |
| Entry | 42 |

## Last section

End of the reference.
'''
    for i in range(10):
        meta={'title':('Reference guide ' if english else '旅行资料 ')+str(i),'date':'2026-01-%02d'%(i+1),'tags':['Reference'] if i<6 else [],'demo':True,'category':category,'pinned':i==0}
        if i==5:meta['category']='Reference' if english else '资料'
        if i==6:meta['category']='Ideas' if english else '摄影'
        if i==7:meta.pop('category')
        if i==8:meta['category']=None
        if i==9:meta['category']='未分类'
        (folder/('guide' if i==0 else 'entry-'+str(i))).with_suffix('.md').write_text('---\n'+json.dumps(meta,ensure_ascii=False)+'\n---\n\n'+body)
    return folder


def api(route):
    headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'}
    if route.request.method=='OPTIONS': route.fulfill(status=204,headers=headers);return
    path=route.request.url.split('?')[0]
    if path.endswith('/recent'):value=[{'id':'one','key':'/posts/guide/','author':'Ada','excerpt':'A service comment.','createdAt':'2026-01-01T01:30:00Z'}]
    elif path.endswith('/count'):value={'count':1}
    else:value=[{'id':'one','author':'Ada','text':'A service comment.'}]
    route.fulfill(body=json.dumps(value),content_type='application/json',headers=headers)


def run(browser,name,cfg,content,base,screenshots):
    dist=build('personalization-'+name,cfg,content,base)
    # A licensed existing dependency font, copied only to ignored test output.
    if cfg.get('appearance',{}).get('webFonts'):
        fonts=dist/'fonts';fonts.mkdir(exist_ok=True)
        shutil.copy(ROOT/'node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff2',fonts/'audit.woff2')
    server,url=start_server(dist,base);errors=[];tones={}
    try:
        if name!='default':
            plain=browser.new_context(java_script_enabled=False)
            external_routes(plain,'/tmp/nekomi-p11/cdn');static=plain.new_page();static.goto(url)
            expect(static.locator('.top-link-fallback:visible')).to_have_count(2)
            expect(static.locator('.top-links mdui-button').first).to_be_hidden()
            plain.close()
        for mobile,mode in [(False,'light'),(False,'dark'),(True,'light'),(True,'dark')]:
            context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,service_workers='block')
            context.add_init_script('window.siteParses=0;const parse=JSON.parse;JSON.parse=function(value,...rest){if(value===document.getElementById("site-data")?.textContent)siteParses++;return parse.call(JSON,value,...rest)}')
            external_routes(context,'/tmp/nekomi-p11/cdn');context.route('https://comments.example/**',api)
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);ready(page)
            data=json.loads(page.locator('#site-data').text_content());ui=data['ui'];zone=data['publishing']['timeZone'];language=data['publishing']['language']
            page.evaluate('(m)=>NekomiTheme.setMode(m)',mode)
            assert page.locator('html').get_attribute('lang')==language
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            expect(page.locator('[data-search]').first).to_have_attribute('placeholder',ui['search']['placeholder'])
            expect(page.locator('#side-desktop-updates')).to_have_text(ui['sidebar']['updates'])
            expect(page.locator('#side-mobile-friends')).to_have_text(ui['sidebar']['friends'])
            if name=='default':
                assert page.locator('.top-links,style[data-nekomi-fonts]').count()==0
                assert page.locator('.post-card').evaluate_all('nodes=>nodes.every(n=>n.dataset.tone==="primary")')
            else:
                expect(page.locator('.top-links mdui-button')).to_have_count(2)
                assert page.locator('.top-links mdui-tab').count()==0
                expect(page.locator('.top-links mdui-button').first).to_have_attribute('href',base+'friends/')
                expect(page.locator('.top-links mdui-button').nth(1)).to_have_attribute('target','_blank')
                assert 'noopener' in page.locator('.top-links mdui-button').nth(1).get_attribute('rel')
                assert page.locator('.post-card[data-post-id=guide]').get_attribute('data-tone').startswith('category-')
                for pid in ['entry-7','entry-8','entry-9']:
                    meta=next(post for post in data['posts'] if post['id']==pid)
                    assert meta['category']==data['content']['defaultCategory'] and meta['categoryKey'] is None
                    assert '<section class="related-posts"' not in (dist/'posts'/pid/'index.html').read_text()
                badge=page.locator('.post-card[data-post-id=guide] .post-category')
                colors=badge.evaluate('e=>[getComputedStyle(e).color,getComputedStyle(e).backgroundColor]')
                tones[mode]=colors
                assert colors[0]!=colors[1]
                assert page.locator('.post-category').evaluate_all('''nodes=>{
                  const lum=value=>{const rgb=value.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};
                  return nodes.every(node=>{const css=getComputedStyle(node),a=lum(css.color),b=lum(css.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5});
                }''')
                assert page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--mdui-color-"+document.querySelector(".post-card").dataset.tone+"-container").trim()!==""')
                # Locale formatting of a date-only value must stay on the authored day.
                expected=page.evaluate('(lang)=>new Intl.DateTimeFormat(lang,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}).format(new Date("2026-01-01T00:00:00Z"))',language)
                expect(page.locator('.post-card[data-post-id=guide] time')).to_have_text(expected)
                if name=='journal':assert not page.locator('.post-example,.post-pinned').count()
                if data['appearance']['webFonts']:
                    page.evaluate('document.fonts.ready')
                    assert page.evaluate('document.fonts.check("16px AuditFont")')
                    expect(page.locator('link[rel=preload][as=font]')).to_have_attribute('href',base+'fonts/audit.woff2')
            for tab,key,limit in [('categories','categoriesTitle',data['content']['categoryPreviewLimit']),('tags','tagsTitle',None),('archive','archiveTitle',data['content']['archivePreviewLimit'])]:
                page.locator('#tab-'+tab).click();expect(page.locator('#content-tabs')).to_have_js_property('value',tab)
                expect(page.locator('#panel-'+tab+' h1')).to_have_text(ui['home'][key])
                if limit is not None:
                    assert page.locator('#panel-'+tab+' .collection-card').evaluate_all('(nodes,limit)=>nodes.every(n=>n.querySelectorAll("mdui-list-item").length<=limit)',limit)
                    if limit==0: assert page.locator('#panel-'+tab+' mdui-list').count()==0
                link=page.locator('#panel-'+tab+' a').first if tab!='tags' else page.locator('#panel-tags mdui-chip').first
                if link.count():
                    href=link.get_attribute('href');assert context.request.get(url.rstrip('/')+href if base=='/' else url.split(base)[0]+href).status==200
            page.locator('#tab-recent').click()
            page.evaluate('window.auditShell={side:document.querySelector("[data-site-sidebar]"),wall:document.querySelector(".site-wallpaper"),origin:performance.timeOrigin}')
            if screenshots and not mobile and mode=='light':
                page.screenshot(path=str(ROOT/'screenshots'/('personalization-'+name+'-home-1440.png')))
            first_id='welcome' if name=='default' else 'guide'
            page.locator('.post-title a[data-post="'+first_id+'"]').click();expect(page.locator('body')).to_have_attribute('data-post-id',first_id);ready(page)
            assert page.evaluate('auditShell.side===document.querySelector("[data-site-sidebar]") && auditShell.wall===document.querySelector(".site-wallpaper") && auditShell.origin===performance.timeOrigin')
            assert page.evaluate('siteParses===1'),'UI must reuse the runtime metadata instead of parsing the full index twice'
            expect(page.locator('[data-return-list]').first).to_contain_text(ui['common']['backToPosts'])
            if name!='default':
                expect(page.locator('#article-date')).to_have_text(expected)
                expect(page.locator('.copy-code').first).to_have_text(ui['reading']['copy'])
                expect(page.locator('.md-callout-title strong').first).to_have_text(ui['markdown']['note'])
                expect(page.locator('.md-details summary')).to_have_text(ui['markdown']['details'])
                page.locator('#comments').scroll_into_view_if_needed()
                expect(page.locator('#comments')).to_have_attribute('data-state','ready',timeout=15000)
                if mobile:
                    page.locator('#menu-button').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',True)
                    page.locator('#side-mobile-comments').click();panel='[data-sidebar=mobile]'
                else:page.locator('#side-desktop-comments').click();panel='[data-sidebar=desktop]'
                time=page.locator(panel+' [data-comments-recent-list] time')
                expect(time).to_have_count(1,timeout=15000)
                timestamp=page.evaluate('([lang,zone])=>new Intl.DateTimeFormat(lang,{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:zone}).format(new Date("2026-01-01T01:30:00Z"))',[language,zone])
                expect(time).to_have_text(timestamp)
                if mobile:page.locator('#drawer-close').click();expect(page.locator('#mobile-drawer')).to_have_js_property('open',False)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if screenshots and mobile and mode=='dark':
                page.evaluate('scrollTo(0,0)');page.wait_for_timeout(300);page.screenshot(path=str(ROOT/'screenshots'/('personalization-'+name+'-reader-390.png')))
            if name!='default':
                page.locator('.top-links mdui-button').first.click();page.wait_for_url(url+'friends/');expect(page.locator('body')).to_have_attribute('data-page','page');ready(page)
                assert page.evaluate('auditShell.origin===performance.timeOrigin && auditShell.side===document.querySelector("[data-site-sidebar]")')
                page.go_back();expect(page.locator('body')).to_have_attribute('data-post-id',first_id);ready(page)
            page.locator('[data-return-list]').first.click();expect(page.locator('body')).to_have_attribute('data-page','home');ready(page)
            if name!='default':
                # Runtime copy must match configured text, including literal angle brackets.
                field=page.locator('[data-sidebar=desktop] [data-search]')
                if mobile:
                    page.locator('#menu-button').click();field=page.locator('[data-sidebar=mobile] [data-search]')
                field.locator('input').fill('guide' if name=='journal' else '旅行')
                expect(page.locator('#feed-title')).to_have_text(ui['search']['title'])
                expect(page.locator('#feed-summary')).to_contain_text('guide' if name=='journal' else '旅行')
                if name=='journal':expect(page.locator('#feed-summary')).to_contain_text('<guide>')
            context.close()
        assert not errors,errors
        if tones: assert tones['light']!=tones['dark'],'Custom HEX must generate different theme roles'
        print('PASS personalization:',name,base,'4 theme/viewport contexts, home/reader/facets, colors, dates, UI, fonts, navigation and comments',flush=True)
    finally:server.shutdown();server.server_close()


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--screenshots',action='store_true');args=parser.parse_args()
    personal=json.loads((ROOT/'examples/personalized.config.json').read_text())
    journal=json.loads((ROOT/'examples/journal.config.json').read_text());journal['cards']={'example':False,'pinned':False}
    for cfg in [personal,journal]:cfg['appearance'].update(brandFont='AuditFont, system-ui',webFonts=[{'family':'AuditFont','src':'/fonts/audit.woff2','preload':True}])
    for cfg in [personal,journal]:cfg['comments']={'provider':'custom','custom':{'module':'./examples/comments/rest-adapter.ts','options':{'endpoint':'https://comments.example/'}}}
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        run(browser,'default',{},None,'/',args.screenshots)
        run(browser,'personal',personal,fixtures('personal','旅行',False),'/',args.screenshots)
        run(browser,'journal',journal,fixtures('journal','Fieldwork',True),'/Journal/',args.screenshots)
        browser.close()

if __name__=='__main__':main()
