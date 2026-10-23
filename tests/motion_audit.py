"""P2.3 production-browser assertions; probe actual View Transition pseudo-elements."""
from pathlib import Path
from urllib.parse import urljoin
import json
import re
from playwright.sync_api import expect

TECH = 'css-grid-two-column-blog'


def ready(page):
    page.wait_for_function('window.NekomiTheme && document.querySelector("main")?.dataset.enhanced === "true"')


def probe(page):
    page.evaluate('''() => {
      window.motionLog = [];
      if (window.nativeMotionStart) return;
      window.nativeMotionStart = document.startViewTransition.bind(document);
      document.startViewTransition = callback => {
        const transition = nativeMotionStart(callback);
        const entry = { finished:false };
        transition.ready.then(() => {
          entry.animations = document.getAnimations().filter(a=>a.effect?.pseudoElement?.startsWith('::view-transition')).map(a=>({
            pseudo:a.effect.pseudoElement, name:a.animationName, duration:a.effect.getTiming().duration,
            easing:a.effect.getTiming().easing, frames:a.effect.getKeyframes()
          }));
          entry.names = [...document.querySelectorAll('[data-shared-title],[data-shared-cover]')].map(e=>e.style.viewTransitionName).filter(Boolean);
          motionLog.push(entry);
        }, error => { entry.error=error.message;motionLog.push(entry); });
        transition.finished.then(()=>entry.finished=true,()=>entry.finished=true);
        return transition;
      };
    }''')


def finish(page, count):
    page.wait_for_function('n=>motionLog.length>=n && motionLog[n-1].finished', arg=count)
    entries = page.evaluate('motionLog')
    assert not any('error' in entry for entry in entries), entries
    assert page.locator('[style*="view-transition-name"]').count() == 0
    return entries[count-1]


def shared(entry, cover=False):
    names = ['post-title'] + (['post-cover'] if cover else [])
    assert sorted(entry['names']) == sorted(names), entry
    for name in names:
        groups = [a for a in entry['animations'] if a['pseudo'] == '::view-transition-group('+name+')']
        assert len(groups) == 1, entry
        animation = groups[0]
        assert animation['duration'] == 500 and any('1.21' in frame['easing'] for frame in animation['frames']), animation
        assert any(animation['frames'][0].get(prop) != animation['frames'][-1].get(prop) for prop in ('transform','width','height')), animation
    assert any(a['name'] == 'nekomi-fade-in' and a['duration'] == 200 for a in entry['animations'])
    assert not any(a['pseudo'] in ('::view-transition-old(post-title)','::view-transition-new(post-title)') for a in entry['animations']), 'Shared lettering should use one moving snapshot without a doubled crossfade'


def motion_checks(page, context, url, requests):
    for width,height in ((1440,900),(390,844)):
        page.set_viewport_size({'width':width,'height':height})
        for mode in ('light','dark'):
            page.goto(url,wait_until='networkidle');ready(page)
            page.evaluate('m=>NekomiTheme.setMode(m)',mode)
            page.wait_for_function('document.querySelector(".wallpaper-image.is-visible")?.naturalWidth>0')
            page.wait_for_timeout(700)
            page.evaluate('window.motionWallpaper=document.querySelector(".wallpaper-image");window.motionOrigin=performance.timeOrigin')
            probe(page)
            page.locator('.post-title a').first.focus()
            page.keyboard.press('Enter')
            page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
            shared(finish(page,1))
            page.locator('.reader-breadcrumb mdui-button').click()
            page.wait_for_url(url+'#recent');ready(page)
            shared(finish(page,2))
            page.go_forward();page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
            shared(finish(page,3))
            assert any(a['name']=='nekomi-in-back' for a in page.evaluate('motionLog[1].animations'))
            page.go_back();page.wait_for_url(url+'#recent');ready(page)
            shared(finish(page,4))
            assert page.evaluate('motionOrigin===performance.timeOrigin && motionWallpaper===document.querySelector(".wallpaper-image")')
            # Real native indicator motion plus the separate panel extension.
            page.locator('#tab-categories').click()
            page.wait_for_function('document.querySelector("#panel-categories").nekomiEntrance?.length===2')
            durations = page.locator('#panel-categories').evaluate('e=>e.nekomiEntrance.map(a=>a.effect.getTiming().duration)')
            assert durations == [350,200], (width,mode,durations)
            indicator=page.locator('#content-tabs').evaluate('e=>getComputedStyle(e.shadowRoot.querySelector("[part=indicator]")).transitionDuration')
            assert indicator != '0s'
            page.locator('#tab-recent').click()
            page.wait_for_timeout(400)
            card=page.locator('.post-card').first
            if width >= 1120:
                card.hover();page.wait_for_timeout(400)
                assert abs(card.evaluate('e=>new DOMMatrix(getComputedStyle(e).transform).f')) < .1
                assert card.evaluate('e=>new DOMMatrix(getComputedStyle(e).transform).a') > 1
            page.locator('.post-title a').first.click();page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
            finish(page,5)
            if width >= 1440:
                page.locator('#toc-desktop-list .toc-list').evaluate('e=>{window.markerMoves=0;e.addEventListener("transitionrun",v=>{if(v.pseudoElement==="::before"&&v.propertyName==="transform")markerMoves++})}')
                page.locator('#toc-desktop-list a[href="#grid-minimum"]').click()
                page.wait_for_function('markerMoves>0')
                page.wait_for_function('!NekomiMotion.isScrolling()')
                page.wait_for_timeout(400)
                assert page.locator('#toc-desktop-list .toc-list').evaluate('e=>Math.abs(new DOMMatrix(getComputedStyle(e,"::before").transform).f-parseFloat(e.style.getPropertyValue("--toc-marker-y")))<1')
                expect(page.locator('#grid-minimum')).to_be_focused()
            # Reduced motion disables pair naming, custom entrance, card scale,
            # and native component/marker transition durations become 1ms.
            page.emulate_media(reduced_motion='reduce')
            page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(url+'#recent');ready(page)
            assert finish(page,6)['names'] == []
            page.locator('.post-title a').first.click();page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
            assert finish(page,7)['names'] == []
            page.emulate_media(reduced_motion='no-preference')
    # Two pending navigations must not leave duplicate/stale shared names.
    page.goto(url,wait_until='networkidle');ready(page);probe(page)
    page.evaluate('()=>{const links=document.querySelectorAll(".post-title a");links[0].click();links[1].click()}')
    page.wait_for_url(url+'posts/md3-palette-for-blog/');ready(page)
    page.wait_for_timeout(800)
    assert page.locator('[style*="view-transition-name"]').count() == 0
    assert not any('error' in entry for entry in page.evaluate('motionLog'))
    # Retarget an already running transition, not only a pending page fetch.
    page.goto(url,wait_until='networkidle');ready(page);probe(page)
    page.evaluate('document.querySelector(".post-title a").click()')
    page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
    page.wait_for_function('motionLog.length===1')
    assert not page.evaluate('motionLog[0].finished'), 'Retarget before the first geometry animation finishes'
    page.evaluate('''base=>{const a=document.createElement('a');a.href=base+'#recent';document.body.append(a);a.click();a.remove()}''',url)
    page.wait_for_url(url+'#recent');ready(page)
    shared(finish(page,2))
    # Exercise Astro's supported fallback on a fresh document, not by changing
    # the feature flag after ClientRouter has evaluated its capability check.
    context.add_init_script('Object.defineProperty(document,"startViewTransition",{value:undefined,configurable:true})')
    page.goto(url,wait_until='networkidle');ready(page)
    page.evaluate('window.fallbackOrigin=performance.timeOrigin')
    page.locator('.post-title a').first.click();page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
    assert page.evaluate('performance.timeOrigin===fallbackOrigin')
    expect(page.locator('#reader')).to_be_visible()
    print('PASS P2.3 motion: actual title geometry/pseudo-elements, forward/reverse/history/keyboard, desktop/mobile/two themes, continuous native TOC marker, native Tabs + separate panel effects, card feedback, reduced motion, rapid navigation and native-API fallback')


def shared_cover_checks(page, context, url, requests):
    for width,height in ((1440,900),(390,844)):
        page.set_viewport_size({'width':width,'height':height})
        for mode in ('light','dark'):
            page.goto(url,wait_until='networkidle');ready(page)
            page.evaluate('m=>NekomiTheme.setMode(m)',mode)
            page.wait_for_function('document.querySelector(".post-cover img")?.naturalWidth>0')
            page.wait_for_timeout(700)
            probe(page)
            page.locator('.post-cover').click();page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
            shared(finish(page,1),True)
            # Use history here: a hero sits below the fold on a small viewport,
            # while returning can still share any currently visible pair.
            page.go_back();page.wait_for_url(url+'#recent');ready(page)
            entry=finish(page,2)
            assert entry['names'] and 'post-title' in entry['names'], entry
            assert len(set(entry['names'])) == len(entry['names'])
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.set_viewport_size({'width':1440,'height':900})
    page.goto(url,wait_until='networkidle');ready(page)
    page.wait_for_function('document.querySelector(".post-cover img")?.naturalWidth>0')
    candidates=page.locator('.post-cover img').get_attribute('srcset').split(', ')
    pending=[];held=set()
    for candidate in candidates:
        resource,width=candidate.rsplit(' ',1)
        if int(width[:-1])>320:
            held.add(urljoin(url,resource))
            context.route(urljoin(url,resource),lambda route:pending.append(route))
    probe(page)
    page.locator('.post-cover').click();page.wait_for_url(url+'posts/'+TECH+'/');ready(page)
    assert pending, 'The destination hero should still be waiting for its image'
    assert finish(page,1)['names']==['post-title']
    for route in pending:route.fulfill(status=503,body=b'image unavailable')
    expect(page.locator('.article-hero')).to_have_count(0)
    # Changing accessibility preferences during a withheld image decode must
    # settle the warmup promise as well as clear names/timers.
    page.goto(url,wait_until='networkidle');ready(page)
    page.wait_for_function('document.querySelector(".post-cover img")?.naturalWidth>0')
    pending.clear();probe(page)
    with page.expect_request(lambda request:request.url in held):
        page.evaluate('document.querySelector(".post-cover").click()')
    page.wait_for_timeout(10)
    assert pending, 'Hold the destination image while changing reduced motion'
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_url(url+'posts/'+TECH+'/',timeout=2000);ready(page)
    assert finish(page,1)['names']==[]
    for route in pending:route.fulfill(status=503,body=b'image unavailable')
    page.emulate_media(reduced_motion='no-preference')
    print('PASS P2.3 cover: real title + optimized cover geometry on desktop/mobile/light/dark, reverse history, unique temporary names, slow-image fallback and reduced-motion change during decode')


def copy_checks(page, context, url, requests):
    root=Path(__file__).resolve().parents[1]
    posts=json.loads((root/'tests/fixtures/content-baseline.json').read_text())
    for route in ['']+['posts/'+post['id']+'/' for post in posts]:
        page.goto(url+route,wait_until='networkidle');ready(page)
        ui=page.locator('body').evaluate('e=>{const c=e.cloneNode(true);c.querySelectorAll(".prose,script,style").forEach(n=>n.remove());return c.textContent}')
        assert not re.search('演示|阅读演示|原型|测试性质',ui), (route,ui)
        text=page.locator('main').inner_text()
        assert not re.search('用于展示|用于验证 Nekomi|并不是站长|不是站长|想象唱片|排版样本',text),route
        expect(page.locator('.sidebar .site-name')).to_have_text('小林的小窝')
        expect(page.locator('.sidebar .site-tagline')).to_have_text('分享技术、日常')
    data=page.locator('#site-data').text_content()
    assert all(post['demo'] for post in json.loads(data)['posts'])
    assert json.loads(data)['friends']==[] and json.loads(data)['comments']['items']==[]
    print('PASS P2.3 copy: home/all ten public articles contain no prototype notices; personal identity and replaceable demo metadata retained, no invented friendships/comments or real-life listening/walking claims')
