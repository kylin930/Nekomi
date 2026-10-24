"""v1.0.0 release metadata and shipped demo indexing protection.

Only temporary copies receive a real-post fixture or public-site configuration.
No tag, release, deployment or authored Markdown is changed by this script.
"""
import json
import re
import shutil
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

from theme_audit import ROOT, ARTIFACTS, build

VERSION = '1.0.0'
PUBLIC_ID = 'release-public-check'


class Metadata(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.robots = None
        self.canonical = None
        self.label = False
        self.graph = []
        self._ld = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name') == 'robots':
            self.robots = attrs.get('content')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if 'example-label' in attrs.get('class', '').split():
            self.label = True
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self._ld = []

    def handle_data(self, data):
        if self._ld is not None:
            self._ld.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self._ld is not None:
            self.graph.extend(json.loads(''.join(self._ld)).get('@graph', []))
            self._ld = None


def check_versions():
    manifest = json.loads((ROOT / 'package.json').read_text())
    lock = json.loads((ROOT / 'package-lock.json').read_text())
    assert manifest['version'] == lock['version'] == lock['packages']['']['version'] == VERSION
    assert manifest['private'] is True  # GitHub template, not an npm publication.
    assert manifest['engines']['node'] == '>=22.23.4'
    assert manifest['dependencies']['mdui'] == '2.1.5'
    notes = (ROOT / 'docs/releases/v1.0.0.md').read_text()
    assert 'Node.js ≥22.23.4' in notes and 'Node.js 24 LTS' in notes
    assert 'npm ci' in notes and 'git clone --branch v1.0.0' in notes
    assert 'MIT License' in (ROOT / 'LICENSE').read_text()
    assert (ROOT / 'public/THIRD-PARTY-LICENSES.txt').stat().st_size > 0
    print('PASS release: version/lock/Node/MDUI/license and Chinese release notes', flush=True)


def check_demos(dist, base, samples):
    origin = 'https://release.example'
    sitemap = ''.join(file.read_text() for file in dist.glob('sitemap*.xml'))
    items = ET.fromstring((dist / 'rss.xml').read_text()).findall('./channel/item')
    links = [item.findtext('link') for item in items]
    real_url = origin + base + 'posts/' + PUBLIC_ID + '/'
    assert links == [real_url], links
    assert real_url in sitemap
    for sample in samples:
        html = (dist / 'posts' / sample.stem / 'index.html').read_text()
        meta = Metadata(html)
        url = origin + base + 'posts/' + sample.stem + '/'
        assert not meta.label and '示例文章 · 可替换的主题内容' not in html
        assert meta.robots == 'noindex, follow', (sample.stem, meta.robots)
        assert meta.canonical == url
        assert all(item['@type'] != 'BlogPosting' for item in meta.graph)
        assert url not in links and url not in sitemap
    real = Metadata((dist / 'posts' / PUBLIC_ID / 'index.html').read_text())
    assert real.robots == 'index, follow' and real.canonical == real_url
    assert any(item['@type'] == 'BlogPosting' for item in real.graph)
    print('PASS demo protection:', base, len(samples), 'unchanged demo:true posts, no label, noindex, excluded RSS/Sitemap/BlogPosting; real post still indexed', flush=True)


def main():
    check_versions()
    samples = sorted((ROOT / 'src/content/posts').glob('*.md'))
    assert samples
    snapshot = {file: file.read_bytes() for file in samples}
    posts = ARTIFACTS / 'release-v100-posts'
    posts.mkdir(parents=True, exist_ok=True)
    for sample in samples:
        frontmatter = sample.read_text().split('---', 2)[1]
        assert re.search(r'^demo:\s*true\s*$', frontmatter, re.M), sample.name
        shutil.copy(sample, posts / sample.name)
    (posts / (PUBLIC_ID + '.md')).write_text('''---
title: 仅用于发布回归的正式内容
date: '2026-01-03'
demo: false
---

## 检查发布元数据

此文章只存在于临时测试目录，不属于主题示例或站长实际发表的文章。
''')
    settings = {'demo': False, 'publishing': {'url': 'https://release.example', 'indexing': True}}
    for base, suffix in [('/', 'root'), ('/Nekomi/', 'base')]:
        dist = build('release-v100-' + suffix, settings, posts, base)
        check_demos(dist, base, samples)
    assert all(file.read_bytes() == body for file, body in snapshot.items())
    print('PASS authored examples unchanged', flush=True)


if __name__ == '__main__':
    main()
