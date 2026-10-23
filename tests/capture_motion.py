"""Capture P2.3 production pages and real-time motion, without changing site data.

Pass a separately built cover fixture to --dist to capture the configured cover
state. --wallpaper replays a previously HTTP-fetched, reviewed image response.
"""
import argparse
import hashlib
import mimetypes
import os
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
from browser_audit import start_server, ready, TECH


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,default=Path('dist'))
    parser.add_argument('--base',default='/')
    parser.add_argument('--out',type=Path,default=Path('screenshots'))
    parser.add_argument('--label',default='p23')
    parser.add_argument('--wallpaper',type=Path)
    parser.add_argument('--cdn-cache',type=Path)
    parser.add_argument('--video',action='store_true')
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    server,url=start_server(args.dist,args.base)

    def setup(context):
        if args.cdn_cache:
            args.cdn_cache.mkdir(parents=True,exist_ok=True)
            def font(route):
                key=args.cdn_cache/hashlib.sha256(route.request.url.encode()).hexdigest();meta=key.with_suffix('.type')
                if not key.exists() or not meta.exists():
                    result=subprocess.run(['curl','--fail','--location','--silent','--show-error','--compressed','--max-time','45','--user-agent',route.request.headers.get('user-agent',''),'--output',str(key),'--write-out','%{content_type}',route.request.url],capture_output=True,text=True,check=True)
                    meta.write_text(result.stdout)
                route.fulfill(body=key.read_bytes(),headers={'content-type':meta.read_text(),'access-control-allow-origin':'*'})
            context.route('https://fonts.googleapis.com/**',font)
            context.route('https://fonts.gstatic.com/**',font)
        if args.wallpaper:
            context.route('https://www.nekopara.uk/pic_api',lambda r:r.fulfill(body=args.wallpaper.read_bytes(),content_type=mimetypes.guess_type(str(args.wallpaper))[0] or 'image/png'))

    def stable(page,mode):
        ready(page);page.evaluate('m=>NekomiTheme.setMode(m)',mode)
        page.wait_for_function('document.querySelector(".wallpaper-image.is-visible")?.naturalWidth>0')
        page.wait_for_timeout(750)

    def shot(page,name):
        page.screenshot(path=str(args.out/(args.label+'-'+name+'.png')),animations='disabled')

    proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],proxy={'server':proxy,'bypass':'127.0.0.1,localhost'} if proxy else None)
        try:
            for width,height in ((1440,900),(390,844)):
                context=browser.new_context(viewport={'width':width,'height':height},service_workers='block')
                setup(context);page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                for mode in ('light','dark'):
                    page.goto(url,wait_until='networkidle');stable(page,mode);page.mouse.move(0,0)
                    shot(page,f'home-{mode}-{width}x{height}')
                    page.locator('.post-title a').first.click();page.wait_for_url(url+'posts/'+TECH+'/');stable(page,mode)
                    shot(page,f'reader-{mode}-{width}x{height}')
                    if width<1440:
                        page.locator('#toc-toggle').click();page.wait_for_timeout(500)
                        page.evaluate('scrollTo(0,0)');shot(page,f'toc-{mode}-{width}x{height}')
                    else:
                        page.locator('#toc-desktop-list a[href="#grid-minimum"]').click()
                        page.wait_for_function('!NekomiMotion.isScrolling()');page.wait_for_timeout(450)
                        shot(page,f'toc-{mode}-{width}x{height}')
                assert not errors,errors
                context.close()

            if args.video:
                video_dir=args.out/('.'+args.label+'-raw-video');video_dir.mkdir(exist_ok=True)
                for width,height in ((1440,900),(390,844)):
                    context=browser.new_context(viewport={'width':width,'height':height},service_workers='block',record_video_dir=str(video_dir),record_video_size={'width':width,'height':height})
                    setup(context);page=context.new_page();page.goto(url,wait_until='networkidle');stable(page,'light')
                    page.mouse.move(0,0);page.wait_for_timeout(700)
                    page.locator('.post-title a').first.hover();page.wait_for_timeout(500)
                    page.locator('.post-title a').first.click();page.wait_for_url(url+'posts/'+TECH+'/');ready(page);page.wait_for_timeout(1000)
                    page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(url+'#recent');ready(page);page.wait_for_timeout(900)
                    page.go_forward();page.wait_for_url(url+'posts/'+TECH+'/');ready(page);page.wait_for_timeout(900)
                    if width<1440:
                        page.locator('#toc-toggle').click();page.wait_for_timeout(600)
                        page.locator('#toc-inline-list a[href="#grid-minimum"]').click()
                    else:
                        page.locator('#toc-desktop-list a[href="#grid-minimum"]').click()
                    page.wait_for_function('!NekomiMotion.isScrolling()');page.wait_for_timeout(900)
                    # Two browser-history steps: section -> article -> home.
                    page.evaluate('history.go(-2)');page.wait_for_url(url+'#recent');ready(page);page.wait_for_timeout(900)
                    page.locator('#tab-categories').click();page.wait_for_timeout(700)
                    page.locator('#tab-tags').click();page.wait_for_timeout(700)
                    page.locator('#tab-recent').click();page.wait_for_timeout(700)
                    if width<1440:
                        page.locator('#menu-button').click();page.wait_for_timeout(650)
                        page.locator('#side-mobile-friends').click();page.wait_for_timeout(650)
                        page.locator('#side-mobile-comments').click();page.wait_for_timeout(650)
                        page.locator('#drawer-close').click();page.wait_for_timeout(650)
                    page.locator('.sidebar-settings [data-theme-cycle]' if width>=1440 else '.site-appbar [data-theme-cycle]').click()
                    page.wait_for_timeout(1100)
                    raw=Path(page.video.path());context.close()
                    # Lossless timing is retained; only browser startup / blank
                    # leading frames are removed from the delivery clip.
                    target=args.out/f'{args.label}-motion-{width}x{height}.webm'
                    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','3','-i',str(raw),'-an','-c:v','libvpx-vp9','-crf','31','-b:v','0','-cpu-used','5','-threads','2','-row-mt','1',str(target)],check=True)
                    raw.unlink()
                video_dir.rmdir()
            print('Captured production screenshots'+(' and real-time videos' if args.video else ''),flush=True)
        finally:
            browser.close();server.shutdown();server.server_close()


if __name__=='__main__':main()
