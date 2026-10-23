"""Record real P2.4 pagination and list-return interactions in a built fixture."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from playwright.sync_api import sync_playwright
from browse_audit import external_routes,ready,follow
from browser_audit import start_server


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,required=True);parser.add_argument('--base',default='/')
    parser.add_argument('--out',type=Path,default=Path('screenshots'))
    parser.add_argument('--cdn-cache',type=Path,default=Path('/tmp/nekomi-p11/cdn'))
    parser.add_argument('--wallpaper',type=Path)
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    server,url=start_server(args.dist,args.base);measurements=[]
    try:
        with tempfile.TemporaryDirectory(prefix='nekomi-p24-video-') as videos,sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'} if os.environ.get('HTTPS_PROXY') else None)
            for width,height in ((1440,900),(390,844)):
                context=browser.new_context(viewport={'width':width,'height':height},service_workers='block',record_video_dir=videos,record_video_size={'width':width,'height':height})
                external_routes(context,args.cdn_cache,args.wallpaper)
                recording_started=time.monotonic();page=context.new_page();errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto(url,wait_until='networkidle');ready(page)
                page.evaluate('NekomiTheme.setMode("light")')
                page.wait_for_function('document.querySelector(".wallpaper-image.is-visible")?.naturalWidth>0')
                page.wait_for_timeout(750)
                page.evaluate('window.captureWallpaper=document.querySelector(".wallpaper-image");window.captureOrigin=performance.timeOrigin')
                # Trim only the actual startup interval; retain normal playback.
                clip_start=max(0,time.monotonic()-recording_started-.2)
                page.mouse.move(width*.78,height*.65);page.wait_for_timeout(350)
                page.mouse.wheel(0,900);page.wait_for_function('document.querySelectorAll(".post-card").length>=12');page.wait_for_timeout(700)
                page.mouse.wheel(0,900);page.wait_for_function('document.querySelectorAll(".post-card").length>=18');page.wait_for_timeout(650)
                identifier=page.locator('#post-list .post-title a').evaluate_all('es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.top>150&&r.bottom<innerHeight-80})[0]?.dataset.post')
                assert identifier,'A loaded article should be visible'
                link=page.locator(f'#post-list .post-title a[data-post="{identifier}"]')
                y=page.evaluate('scrollY');count=page.locator('.post-card').count()
                page.screenshot(path=str(args.out/f'p24-list-before-{width}x{height}.png'),animations='disabled')
                link.hover();page.wait_for_timeout(350)
                follow(page,link);page.wait_for_timeout(800)
                page.locator('.reader-breadcrumb mdui-button').click();page.wait_for_url(url+'#recent');ready(page);page.wait_for_timeout(800)
                restored=page.evaluate('scrollY')
                assert abs(restored-y)<=2,(width,y,restored)
                assert page.locator('.post-card').count()==count
                page.mouse.move(0,0)
                page.screenshot(path=str(args.out/f'p24-list-restored-{width}x{height}.png'),animations='disabled')
                page.go_forward();page.wait_for_url(url+'posts/'+identifier+'/');ready(page);page.wait_for_timeout(700)
                page.go_back();page.wait_for_url(url+'#recent');ready(page);page.wait_for_timeout(700)
                page.mouse.move(width*.78,height*.65);page.mouse.wheel(0,700);page.wait_for_timeout(1000)
                page.locator('.sidebar-settings [data-theme-cycle]' if width>=1120 else '.site-appbar [data-theme-cycle]').click()
                page.wait_for_timeout(800);page.mouse.move(0,0)
                page.screenshot(path=str(args.out/f'p24-list-dark-{width}x{height}.png'),animations='disabled')
                assert page.evaluate('captureWallpaper===document.querySelector(".wallpaper-image")&&captureOrigin===performance.timeOrigin')
                assert not errors,errors
                measurements.append({'viewport':[width,height],'loadedBeforeArticle':count,'scrollBefore':y,'scrollRestored':restored,'loadedAtEnd':page.locator('.post-card').count(),'post':identifier})
                raw=Path(page.video.path());context.close()
                subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',f'{clip_start:.3f}','-i',str(raw),'-an','-c:v','libvpx-vp9','-crf','31','-b:v','0','-cpu-used','8','-threads','2','-row-mt','1',str(args.out/f'p24-browse-{width}x{height}.webm')],check=True)
            browser.close()
        (args.out/'p24-capture.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n')
        print('Captured actual list return/pagination videos:',json.dumps(measurements,ensure_ascii=False),flush=True)
    finally:server.shutdown();server.server_close()


if __name__=='__main__':main()
