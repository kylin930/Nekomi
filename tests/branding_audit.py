"""Targeted production-static branding checks; no theme or authored content changes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import xml.etree.ElementTree as ET

from playwright.sync_api import sync_playwright, expect
from browser_audit import ROOT, start_server, ready

ARTIFACTS = ROOT / '.astro/brand-tests'
SOURCE_HASH = 'ff1f48cd17f0812baa7ae3651ab25b05e0c4ededd966c9625442ab5c99a87ef3'
CASES = [
    ('default', None, None, '/', '/favicon.svg', '/apple-touch-icon.png', 'image/svg+xml'),
    ('empty', {'site': {'favicon': '', 'appleTouchIcon': ' '}, 'publishing': {'base': '/Nekomi/'}}, None,
     '/Nekomi/', '/Nekomi/favicon.svg', '/Nekomi/apple-touch-icon.png', 'image/svg+xml'),
    ('local', {'site': {'favicon': '/images/my-icon.svg?v=1', 'appleTouchIcon': '/Theme/images/my-touch.png'}, 'publishing': {'base': '/unused/'}}, '/Theme/',
     '/Theme/', '/Theme/images/my-icon.svg?v=1', '/Theme/images/my-touch.png', 'image/svg+xml'),
    ('https', {'site': {'favicon': 'https://icons.example/brand.svg?v=2', 'appleTouchIcon': 'https://icons.example/touch.png'}}, '/',
     '/', 'https://icons.example/brand.svg?v=2', 'https://icons.example/touch.png', 'image/svg+xml'),
    ('png', {'site': {'favicon': '/apple-touch-icon.png'}}, '/',
     '/', '/apple-touch-icon.png', '/apple-touch-icon.png', None),
]


def resources():
    svg = (ROOT / 'public/favicon.svg').read_bytes()
    assert hashlib.sha256(svg).hexdigest() == SOURCE_HASH, 'Supplied design must remain byte-identical.'
    tree = ET.fromstring(svg)
    assert tree.attrib['viewBox'] == '0 0 1536 1536'
    assert not any(node.tag.rsplit('}', 1)[-1] in ('script', 'image', 'foreignObject', 'style') for node in tree.iter())
    assert not any(key.rsplit('}', 1)[-1] == 'href' or key.lower().startswith('on') for node in tree.iter() for key in node.attrib)
    def png_size(data):
        assert data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR'
        return struct.unpack('>II', data[16:24])
    apple = (ROOT / 'public/apple-touch-icon.png').read_bytes()
    assert png_size(apple) == (180, 180) and apple[25] == 6  # RGBA
    ico = (ROOT / 'public/favicon.ico').read_bytes()
    assert struct.unpack('<HHH', ico[:6]) == (0, 1, 3)
    sizes = set()
    for index in range(3):
        width, height, _, _, planes, depth, length, offset = struct.unpack('<BBBBHHII', ico[6 + index * 16:22 + index * 16])
        assert (planes, depth) == (1, 32) and offset + length <= len(ico)
        assert png_size(ico[offset:offset + length]) == (width, height)
        sizes.add((width, height))
    assert sizes == {(16, 16), (32, 32), (48, 48)}
    assert png_size((ROOT / 'docs/brand/github-social-preview.png').read_bytes()) == (1280, 640)
    assert 'src="public/favicon.svg"' in (ROOT / 'README.md').read_text()
    print('PASS source SHA-256, no external SVG dependencies, Apple / ICO / social dimensions, README logo', flush=True)


def build(case, reuse):
    name, config, env_base, *_ = case
    folder = ARTIFACTS / name
    dist = folder / 'dist'
    if not reuse:
        folder.mkdir(parents=True, exist_ok=True)
        env = {**os.environ, 'ASTRO_TELEMETRY_DISABLED': '1', 'ASTRO_OUT_DIR': str(dist), 'ASTRO_CACHE_DIR': str(folder / 'cache')}
        for key in ('SITE_BASE', 'SITE_URL', 'NEKOMI_CONFIG', 'NEKOMI_CONTENT_DIR', 'NEKOMI_PAGES_DIR'):
            env.pop(key, None)
        if config is not None:
            file = folder / 'site.json'; file.write_text(json.dumps(config))
            env['NEKOMI_CONFIG'] = str(file)
        if env_base is not None:
            env['SITE_BASE'] = env_base
        result = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, env=env, text=True, capture_output=True)
        (folder / 'build.log').write_text(result.stdout + result.stderr)
        assert result.returncode == 0, result.stdout + result.stderr
    assert (dist / 'index.html').exists(), f'Missing production output: {name}'
    # Custom public resource fixture only; never added to theme assets.
    (dist / 'images').mkdir(exist_ok=True)
    shutil.copyfile(ROOT / 'public/favicon.svg', dist / 'images/my-icon.svg')
    shutil.copyfile(ROOT / 'public/apple-touch-icon.png', dist / 'images/my-touch.png')
    assert (dist / 'favicon.svg').read_bytes() == (ROOT / 'public/favicon.svg').read_bytes()
    print('PASS production build:', name, flush=True)
    return dist


def exercise(browser, case, dist):
    name, _, _, base, favicon, apple, mime = case
    server, url = start_server(dist, base)
    try:
        for mobile, mode in [(False, 'light'), (False, 'dark'), (True, 'light'), (True, 'dark')]:
            context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 900},
                                          is_mobile=mobile, has_touch=mobile, color_scheme=mode, service_workers='block')
            # Brand tests isolate the existing icon font service; no new remote dependency.
            context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
            context.route('https://icons.example/brand.svg*', lambda r: r.fulfill(path=ROOT / 'public/favicon.svg', content_type='image/svg+xml'))
            context.route('https://icons.example/touch.png', lambda r: r.fulfill(path=ROOT / 'public/apple-touch-icon.png', content_type='image/png'))
            page = context.new_page(); errors = []; requests = []; bad = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('request', lambda r: requests.append(r.url))
            page.on('response', lambda r: bad.append((r.url, r.status)) if r.status >= 400 else None)
            page.goto(url); ready(page)
            page.evaluate('(mode) => NekomiTheme.setMode(mode)', mode)

            def links():
                expect(page.locator('link[rel=icon]')).to_have_count(1)
                expect(page.locator('link[rel=icon]')).to_have_attribute('href', favicon)
                assert page.locator('link[rel=icon]').get_attribute('type') == mime
                expect(page.locator('link[rel=apple-touch-icon]')).to_have_count(1)
                expect(page.locator('link[rel=apple-touch-icon]')).to_have_attribute('href', apple)

            links()
            # Decode the actual linked resources, not an unrelated replacement image.
            sizes = page.evaluate('''async () => {
              const sizes = [];
              for (const rel of ['icon', 'apple-touch-icon']) {
                const image = new Image(); image.src = document.querySelector(`link[rel="${rel}"]`).href;
                await image.decode(); sizes.push([image.naturalWidth, image.naturalHeight]);
              }
              return sizes;
            }''')
            assert sizes == ([[180, 180], [180, 180]] if name == 'png' else [[1024, 1024], [180, 180]]), sizes
            data = json.loads(page.locator('#site-data').text_content())
            assert data['site']['avatar'] == '', 'Favicon must not become the site avatar.'
            if name == 'default':
                # Also verify that the static host returns correct MIME and bytes.
                for path, content_type in [('favicon.svg', 'image/svg+xml'), ('apple-touch-icon.png', 'image/png'), ('favicon.ico', 'image/')]:
                    response = context.request.get(url + path)
                    assert response.status == 200 and content_type in response.headers['content-type']
                    assert response.body() == (ROOT / 'public' / path).read_bytes()
            page.evaluate('window.brandTime = performance.timeOrigin')
            page.locator('.post-title a').first.click()
            page.wait_for_url(url + 'posts/**'); expect(page.locator('body')).to_have_attribute('data-page', 'article'); ready(page); links()
            assert page.evaluate('brandTime === performance.timeOrigin')
            page.go_back(); page.wait_for_url(lambda href: href.split('#')[0] == url)
            expect(page.locator('body')).to_have_attribute('data-page', 'home'); ready(page); links()
            assert page.evaluate('brandTime === performance.timeOrigin')
            assert not any('data:,' in request or '/favicon.ico' in request for request in requests), requests
            assert not bad and not errors, (bad, errors)
            context.close()
        print('PASS browser:', name, 'desktop/mobile × light/dark, linked image decode, ClientRouter/back, no failed resources', flush=True)
    finally:
        server.shutdown(); server.server_close()


def screenshot(browser, dist):
    server, url = start_server(dist)
    try:
        page = browser.new_page(viewport={'width': 780, 'height': 350}, device_scale_factor=2)
        page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        page.goto(url)
        page.set_content('''<style>
          body{margin:0;display:flex;font:14px system-ui} section{width:390px;height:350px;box-sizing:border-box;padding:24px;background:#fff;color:#222}
          section+section{background:#19151f;color:#fff} .icons{height:90px;display:flex;align-items:center;gap:22px} img{object-fit:contain}
          </style>''' + ''.join(f'''<section><h3>{title}</h3><p>SVG · 16 / 32 / 64px</p><div class="icons">''' +
          ''.join(f'<img src="{url}favicon.svg" width="{s}" height="{s}">' for s in (16, 32, 64)) +
          f'</div><p>Apple Touch Icon · 180 × 180</p><img src="{url}apple-touch-icon.png" width="100" height="100"></section>'
          for title in ('Light', 'Dark')))
        page.evaluate('Promise.all(Array.from(document.images, image => image.decode()))')
        page.screenshot(path=str(ROOT / 'docs/brand/browser-icons.png'))
        page.close()
    finally:
        server.shutdown(); server.server_close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--reuse', action='store_true'); parser.add_argument('--screenshots', action='store_true')
    parser.add_argument('--chromium', default=shutil.which('chromium'))
    args = parser.parse_args(); resources()
    outputs = [build(case, args.reuse) for case in CASES]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium, args=['--no-sandbox'])
        for case, dist in zip(CASES, outputs): exercise(browser, case, dist)
        if args.screenshots: screenshot(browser, outputs[0])
        browser.close()
