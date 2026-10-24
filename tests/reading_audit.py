"""P3.1 production browser coverage; fixtures and third-party videos never ship."""

import argparse, json, shutil, re
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright, expect
from theme_audit import build, ARTIFACTS, ROOT
from browser_audit import start_server
from browse_audit import external_routes


def ready(page, kind="article"):
    expect(page.locator("body")).to_have_attribute("data-page", kind)
    if kind == "article":
        expect(page.locator("body")).to_have_attribute(
            "data-post-id", unquote(urlparse(page.url).path.rstrip("/").split("/")[-1])
        )
    expect(page.locator("#main-content")).to_have_attribute("data-enhanced", "true")


def fixtures():
    folder = ARTIFACTS / "p31-posts"
    folder.mkdir(exist_ok=True, parents=True)
    for source in (ROOT / "src/content/posts").glob("*.md"):
        shutil.copy(source, folder / source.name)
    welcome = folder / "welcome.md"
    welcome.write_text(
        welcome.read_text().replace("demo: true", "demo: true\nreadingTime: 7")
    )
    guide = folder / "markdown-guide.md"
    guide.write_text(
        guide.read_text().replace("demo: true", "demo: true\nreadingTime: false")
    )
    ext = folder / "markdown-extensions.md"
    ext.write_text(ext.read_text() + """

## 临时边界验证 {#boundaries}

![破损图片](/images/missing-p31.png)

```mermaid
this is deliberately not a graph
```

```mermaid
%%{init: {'securityLevel': 'loose'}}%%
flowchart LR
 A-->B
```

::::::tabs[嵌套外层]
:::::tab[第一项]
::::tabs[嵌套内层]
:::tab[内部一]
内部一正文。
:::
:::tab[内部二]
### 嵌套标题 {#nested-heading}
内部二正文。
:::
::::
:::::
:::::tab[第二项]
另一项正文。
:::::
::::::

$$
a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}+a_{11}+a_{12}+a_{13}+a_{14}+a_{15}+a_{16}=0
$$
""")
    (folder / "draft-p31.md").write_text(
        '---\ntitle: 不应公开的关联草稿\ndate: "2026-01-01"\ncategory: 开始使用\ntags: [Markdown]\ndraft: true\n---\n草稿'
    )
    (folder / "real-p31.md").write_text(
        '---\ntitle: 临时正式条目\ndate: "2025-01-01"\ncategory: 开始使用\ntags: [Markdown]\ndemo: false\n---\n仅用于隔离推荐与索引测试。'
    )
    return folder


def configuration():
    c = json.loads((ROOT / "site.config.json").read_text())
    c["demo"] = False
    c["publishing"] = {"url": "https://blog.example", "indexing": True}
    c["friends"] = [
        {
            "name": "Astro",
            "url": "https://astro.build/",
            "description": "临时配置的公开项目链接",
            "avatar": "/images/missing-avatar.png",
        }
    ]
    c["friendsPage"] = {"enabled": True, "navigation": True}
    return c


def run(browser, dist, base, screenshots):
    server, url = start_server(dist, base)
    errors = []
    try:
        for mobile, mode in [
            (False, "light"),
            (False, "dark"),
            (True, "light"),
            (True, "dark"),
        ]:
            c = browser.new_context(
                viewport={
                    "width": 390 if mobile else 1440,
                    "height": 844 if mobile else 900,
                },
                is_mobile=mobile,
                has_touch=mobile,
                service_workers="block",
            )
            external_routes(c, "/tmp/nekomi-p11/cdn")
            page = c.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            requests = []
            page.on("request", lambda r: requests.append(r.url))
            video = []
            c.route(
                "https://www.youtube-nocookie.com/**",
                lambda r: (
                    video.append(r.request.url),
                    r.fulfill(
                        body='<html><meta charset="utf-8"><title>视频对端回放</title><p>视频对端</p></html>',
                        content_type="text/html",
                    ),
                ),
            )
            c.route(
                "https://player.bilibili.com/**",
                lambda r: (
                    video.append(r.request.url),
                    r.fulfill(
                        body="<html><p>视频对端回放</p></html>",
                        content_type="text/html",
                    ),
                ),
            )
            try:
                page.goto(url + "posts/welcome/", wait_until="networkidle")
                ready(page)
                expect(page.locator("#article-reading-time")).to_have_text("约 7 分钟")
                expect(page.locator(".reader-header .example-label")).to_have_count(0)
                expect(page.locator(".reader-header")).not_to_contain_text("示例文章 · 可替换的主题内容")
                assert not any(
                    "mermaid.core" in item
                    or "diagrams." in item
                    or "/KaTeX_" in item
                    or "lightbox." in item
                    for item in requests
                )
                page.goto(url + "posts/markdown-guide/")
                ready(page)
                assert not page.locator("#article-reading-time").count()
                page.goto(url + "posts/markdown-extensions/", wait_until="networkidle")
                ready(page)
                page.evaluate("mode=>NekomiTheme.setMode(mode)", mode)
                page.wait_for_timeout(700)
                page.evaluate(
                    'window.p31Shell={wall:document.querySelector(".site-wallpaper"),side:document.querySelector("[data-site-sidebar]"),time:performance.timeOrigin}'
                )
                assert (
                    page.locator(".katex").count() == 4
                    and page.locator("[data-nekomi-math]").count() == 1
                )
                assert (
                    page.locator(".md-callout").count() == 6
                    and page.locator("[data-md-tabs]").count() == 3
                    and page.locator("[data-md-video]").count() == 2
                )
                assert not video and not page.locator("[data-md-video] iframe").count()
                assert page.locator(".related-posts mdui-list-item").count() == 2
                assert not page.locator(
                    ".related-posts [data-post=real-p31], .related-posts [data-post=draft-p31]"
                ).count()
                page.locator('img[src*="missing-p31"]').scroll_into_view_if_needed()
                expect(
                    page.locator(".image-fallback").filter(has_text="破损图片")
                ).to_be_visible()
                assert not page.locator('img[src*="missing-p31"]').count()

                def shot(label):
                    if screenshots:
                        page.wait_for_timeout(500)
                        page.screenshot(
                            path=str(
                                ROOT
                                / f"screenshots/p31-{label}-{mode}-{390 if mobile else 1440}.png"
                            )
                        )

                page.locator("#callouts").scroll_into_view_if_needed()
                shot("callouts")
                image = page.locator("#article-body img:not(a img)").first
                image.scroll_into_view_if_needed()
                expect(image).to_have_attribute("role", "button")
                original = image.get_attribute("data-original-src")
                assert original.startswith(base + "_astro/") and original.endswith(
                    ".png"
                )
                assert (
                    c.request.get(
                        url.rstrip("/") + original
                        if base == "/"
                        else url.split(base)[0] + original
                    ).status
                    == 200
                )
                image.focus()
                page.keyboard.press("Enter")
                expect(page.get_by_role("dialog", name="图片查看器")).to_be_visible()
                expect(page.locator(".pswp__counter")).to_have_text("1 / 3")
                expect(page.locator(".nekomi-lightbox-caption a")).to_have_attribute(
                    "href", re.compile(r"\.png$")
                )
                expect(page.get_by_role("dialog", name="图片查看器")).to_be_focused(
                    timeout=10000
                )
                page.keyboard.press("ArrowRight")
                expect(page.locator(".pswp__counter")).to_have_text("2 / 3")
                page.wait_for_timeout(350)
                page.keyboard.press("ArrowLeft")
                expect(page.locator(".pswp__counter")).to_have_text("1 / 3")
                page.locator(".pswp__button--zoom").click()
                page.wait_for_timeout(350)
                shot("lightbox")
                page.keyboard.press("Tab")
                assert page.evaluate(
                    'document.querySelector(".pswp").contains(document.activeElement)'
                )
                page.keyboard.press("Escape")
                expect(page.locator(".pswp")).to_have_count(0)
                expect(image).to_be_focused()
                # Native image links keep their actual HTML navigation.
                linked = page.locator("#article-body a:has(img)").first
                assert linked.get_attribute("href") == base + "posts/markdown-guide/"
                assert linked.locator("img").get_attribute("role") is None
                # Reveal hidden headings through the existing URL/TOC path.
                if mobile:
                    page.locator("#toc-toggle").click()
                    page.locator(
                        '#toc-inline-list mdui-list-item[href="#pnpm-steps"]'
                    ).click()
                else:
                    page.locator(
                        '#toc-desktop-list mdui-list-item[href="#pnpm-steps"]'
                    ).click()
                expect(page.locator("#pnpm-steps")).to_be_focused()
                expect(page.locator("[data-md-tabs]").first).to_have_js_property(
                    "value", "panel-2"
                )
                assert (
                    page.locator("#pnpm-steps").evaluate(
                        "e=>e.getBoundingClientRect().top"
                    )
                    >= 20
                )
                page.goto(url + "posts/welcome/")
                ready(page)
                page.goto(url + "posts/markdown-extensions/#inside-details")
                ready(page)
                expect(page.locator("#inside-details")).to_be_focused()
                assert page.locator("#inside-details").evaluate(
                    'e=>e.closest("details").open'
                )
                page.goto(url + "posts/welcome/")
                ready(page)
                page.goto(url + "posts/markdown-extensions/#nested-heading")
                ready(page)
                expect(page.locator("#nested-heading")).to_be_focused()
                assert page.locator("#nested-heading").is_visible()
                page.evaluate(
                    'window.p31Shell={wall:document.querySelector(".site-wallpaper"),side:document.querySelector("[data-site-sidebar]"),time:performance.timeOrigin}'
                )
                graph = page.locator("[data-md-mermaid]").first
                graph.scroll_into_view_if_needed()
                expect(graph).to_have_attribute(
                    "data-rendered-theme",
                    (
                        mode
                        if page.evaluate("NekomiTheme.getMode()") == mode
                        else page.evaluate("NekomiTheme.getMode()")
                    ),
                    timeout=30000,
                )
                other = (
                    "dark"
                    if page.evaluate("NekomiTheme.getMode()") == "light"
                    else "light"
                )
                page.evaluate("mode=>NekomiTheme.setMode(mode)", other)
                expect(graph).to_have_attribute(
                    "data-rendered-theme", other, timeout=30000
                )
                page.locator("[data-md-mermaid]").nth(1).scroll_into_view_if_needed()
                expect(page.locator("[data-md-mermaid]").nth(1)).to_have_attribute(
                    "data-rendered-theme", other, timeout=30000
                )
                page.evaluate("mode=>NekomiTheme.setMode(mode)", mode)
                expect(graph).to_have_attribute(
                    "data-rendered-theme", mode, timeout=30000
                )
                shot("diagrams")
                for bad in page.locator("[data-md-mermaid]").all()[2:]:
                    bad.scroll_into_view_if_needed()
                    expect(bad.locator("[data-mermaid-status]")).to_contain_text(
                        "渲染失败", timeout=30000
                    )
                    expect(bad.locator("details")).to_have_attribute("open", "")
                for card in page.locator("[data-md-video]").all():
                    card.scroll_into_view_if_needed()
                    card.locator("[data-video-load]").click()
                    expect(card.locator("iframe")).to_have_count(1)
                    assert video
                    card.locator("[data-video-load]").click()
                    expect(card.locator("iframe")).to_have_count(0)
                for width in [390, 320] if mobile else [1440, 1024]:
                    page.set_viewport_size(
                        {"width": width, "height": 844 if mobile else 900}
                    )
                    assert page.evaluate(
                        "document.documentElement.scrollWidth<=innerWidth+1"
                    )
                page.set_viewport_size(
                    {"width": 390 if mobile else 1440, "height": 844 if mobile else 900}
                )
                if mobile:
                    page.locator("#menu-button").click()
                    page.locator(
                        "[data-sidebar=mobile] mdui-tab[value=friends]"
                    ).click()
                else:
                    page.locator(
                        "[data-sidebar=desktop] mdui-tab[value=friends]"
                    ).click()
                page.locator(
                    f'[data-sidebar={"mobile" if mobile else "desktop"}] mdui-button[href="{base}friends/"]'
                ).first.click()
                page.wait_for_url(url + "friends/")
                ready(page, "page")
                expect(page.locator("#friends-title")).to_have_text("友情链接")
                expect(page.locator(".friends-page-list mdui-list-item")).to_have_count(
                    1
                )
                assert (
                    page.locator(".friends-page-list mdui-list-item").get_attribute(
                        "rel"
                    )
                    == "noopener noreferrer"
                )
                shot("friends")
                assert (
                    page.evaluate(
                        'p31Shell.wall===document.querySelector(".site-wallpaper") && p31Shell.side===document.querySelector("[data-site-sidebar]") && p31Shell.time===performance.timeOrigin'
                    )
                    if page.evaluate("typeof p31Shell") != "undefined"
                    else False
                )
                assert (
                    page.locator(
                        ".pswp,.mermaid-scratch,[data-md-video] iframe"
                    ).count()
                    == 0
                )
                page.go_back()
                page.wait_for_url(re.compile("/posts/markdown-extensions/"))
                ready(page)
                assert not errors, errors
            finally:
                c.close()
        print(
            "PASS P3.1 browser",
            base,
            "four viewport/theme contexts: images, math, diagrams, directives, anchors, videos, related, friends, lifetime",
            flush=True,
        )
        plain = browser.new_context(
            java_script_enabled=False, viewport={"width": 390, "height": 844}
        )
        external_routes(plain, "/tmp/nekomi-p11/cdn")
        p = plain.new_page()
        p.goto(url + "posts/markdown-extensions/")
        assert (
            p.locator(".katex").count() == 4
            and p.locator("[data-md-tabs] mdui-tab-panel").count() == 6
        )
        assert all(
            item.is_visible()
            for item in p.locator("[data-md-tabs] mdui-tab-panel").all()
        )
        assert not p.locator("[data-md-video] iframe").count()
        assert p.locator(".md-link-card a[href]").count() == 2
        p.locator(".md-details summary").first.click()
        expect(p.locator("#inside-details")).to_be_visible()
        p.goto(url + "friends/")
        expect(p.locator(".friends-page-list")).to_contain_text("Astro")
        expect(
            p.locator('.friends-page-list a[href="https://astro.build/"]')
        ).to_be_visible()
        plain.close()
        print(
            "PASS no JS",
            base,
            "SSR formulas, all tab contents, native details, source and external links",
            flush=True,
        )
    finally:
        server.shutdown()
        server.server_close()


def disabled(browser, dist, base):
    server, url = start_server(dist, base)
    c = browser.new_context(service_workers="block")
    external_routes(c, "/tmp/nekomi-p11/cdn")
    page = c.new_page()
    requests = []
    page.on("request", lambda r: requests.append(r.url))
    try:
        page.goto(url + "posts/markdown-extensions/", wait_until="networkidle")
        ready(page)
        assert not page.locator(
            ".katex,[data-md-tabs],[data-md-video],[data-md-mermaid],.related-posts,#article-reading-time,[data-nekomi-content],[data-nekomi-math]"
        ).count()
        assert not page.locator(".lightbox-image").count()
        assert not any(
            "mermaid" in item
            or "diagrams." in item
            or "lightbox." in item
            or "markdown-content." in item
            or "KaTeX_" in item
            for item in requests
        )
        assert not (dist / "friends").exists()
        print(
            "PASS features off",
            base,
            "no runtime/CSS/fonts/widgets/route; readable fallback remains",
            flush=True,
        )
    finally:
        c.close()
        server.shutdown()
        server.server_close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="/")
    parser.add_argument("--screenshots", action="store_true")
    args = parser.parse_args()
    posts = fixtures()
    c = configuration()
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=shutil.which("chromium"), args=["--no-sandbox"]
        )
        dist = build(
            "p31-core" + ("-base" if args.base != "/" else ""), c, posts, args.base
        )
        run(browser, dist, args.base, args.screenshots)
        c["reading"] = {"lightbox": False, "readingTime": False, "related": False}
        c["markdown"] = {"math": False, "mermaid": False, "components": False}
        c["friendsPage"] = {"enabled": False, "navigation": True}
        # Explicit per-post readingTime must not obscure a global-off assertion.
        no = ARTIFACTS / "p31-off-posts"
        no.mkdir(exist_ok=True)
        for f in (ROOT / "src/content/posts").glob("*.md"):
            shutil.copy(f, no / f.name)
        dist = build(
            "p31-off" + ("-base" if args.base != "/" else ""), c, no, args.base
        )
        disabled(browser, dist, args.base)
        browser.close()


if __name__ == "__main__":
    main()
