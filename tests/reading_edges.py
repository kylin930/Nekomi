"""P3.1 real Chromium input / cancellation cases against an already built fixture."""

import argparse, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_audit import start_server, ROOT
from browse_audit import external_routes
from reading_audit import ready


def touch(cdp, kind, points):
    cdp.send(
        "Input.dispatchTouchEvent",
        {
            "type": kind,
            "touchPoints": [
                {"id": i + 1, "x": x, "y": y, "radiusX": 2, "radiusY": 2, "force": 1}
                for i, (x, y) in enumerate(points)
            ],
        },
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", default=".astro/p25-tests/p31-core/dist")
    parser.add_argument("--base", default="/")
    args = parser.parse_args()
    server, url = start_server(ROOT / args.dist, args.base)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(
                executable_path=shutil.which("chromium"), args=["--no-sandbox"]
            )
            c = b.new_context(
                viewport={"width": 390, "height": 844},
                is_mobile=True,
                has_touch=True,
                service_workers="block",
            )
            external_routes(c, "/tmp/nekomi-p11/cdn")
            page = c.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(url)
            ready(page, "home")
            page.locator(".post-title a[data-post=markdown-extensions]").click()
            ready(page)
            page.wait_for_timeout(600)
            image = page.locator("#article-body img:not(a img)").first
            image.scroll_into_view_if_needed()
            expect(image).to_have_js_property("complete", True)
            image.click()
            dialog = page.get_by_role("dialog", name="图片查看器")
            expect(dialog).to_be_focused(timeout=10000)
            page.keyboard.press("/")
            expect(page.locator("#mobile-drawer")).to_have_js_property("open", False)
            expect(dialog).to_be_focused()
            cdp = c.new_cdp_session(page)
            # Touch input is sent through Chromium, not synthetic DOM events.
            touch(cdp, "touchStart", [(300, 400)])
            for x in [270, 240, 210, 180, 150, 120, 80]:
                touch(cdp, "touchMove", [(x, 400)])
                page.wait_for_timeout(16)
            touch(cdp, "touchEnd", [])
            expect(page.locator(".pswp__counter")).to_have_text("2 / 3")
            page.wait_for_timeout(600)
            active = page.locator(".pswp__item[aria-hidden=false] .pswp__zoom-wrap")
            before = active.get_attribute("style")
            touch(cdp, "touchStart", [(140, 400), (250, 400)])
            for offset in [10, 20, 30, 40, 50, 65]:
                touch(cdp, "touchMove", [(140 - offset, 400), (250 + offset, 400)])
                page.wait_for_timeout(30)
            touch(cdp, "touchEnd", [])
            page.wait_for_timeout(500)
            assert active.get_attribute("style") != before
            before = active.get_attribute("style")
            touch(cdp, "touchStart", [(195, 400)])
            for x, y in [(200, 410), (210, 430), (220, 450), (230, 475)]:
                touch(cdp, "touchMove", [(x, y)])
                page.wait_for_timeout(25)
            touch(cdp, "touchEnd", [])
            page.wait_for_timeout(500)
            assert active.get_attribute("style") != before
            page.keyboard.press("Escape")
            expect(dialog).to_have_count(0)
            # Existing image links perform real ClientRouter navigation, never open a viewer.
            linked = page.locator("#article-body a:has(img)").first
            linked.click()
            page.wait_for_url(url + "posts/markdown-guide/")
            ready(page)
            assert not page.locator(".pswp").count()
            page.go_back()
            page.wait_for_url(url + "posts/markdown-extensions/")
            ready(page)
            # One-image gallery, reduced motion, and unavailable full-size asset.
            page.emulate_media(reduced_motion="reduce")
            page.evaluate(
                'document.querySelectorAll("#article-body img:not(a img)").forEach((img,i)=>{if(i)img.remove()})'
            )
            image = page.locator("#article-body img:not(a img)").first
            image.scroll_into_view_if_needed()
            image.click()
            expect(dialog).to_be_focused(timeout=10000)
            expect(page.locator(".pswp__counter")).to_have_text("1 / 1")
            assert page.locator(".pswp__button--arrow--next").is_hidden()
            assert page.locator(".pswp").evaluate(
                'e=>getComputedStyle(e).getPropertyValue("--pswp-transition-duration").trim()'
            ) in ("0ms", "0s", "")
            page.keyboard.press("Escape")
            expect(dialog).to_have_count(0)
            image.evaluate(
                "(e,src)=>e.dataset.originalSrc=src",
                args.base + "images/missing-original.png",
            )
            image.click()
            expect(page.locator(".pswp__error-msg")).to_be_visible()
            page.keyboard.press("Escape")
            expect(dialog).to_have_count(0)
            # Navigate away with the viewer still open: cleanup must remove its head CSS too.
            image.evaluate("e=>delete e.dataset.originalSrc")
            image.click()
            expect(dialog).to_be_focused(timeout=10000)
            page.go_back()
            ready(page, "home")
            assert page.locator(".pswp,[data-nekomi-lightbox]").count() == 0
            assert not errors, errors
            c.close()
            # Switch theme while the first Mermaid module is still being fetched.
            c = b.new_context(service_workers="block")
            external_routes(c, "/tmp/nekomi-p11/cdn")
            page = c.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            changed = []

            def delayed(route):
                response = route.fetch()
                page.evaluate('NekomiTheme.setMode("dark")')
                changed.append(True)
                route.fulfill(response=response)

            page.route("**/*mermaid.core*.js", delayed)
            page.goto(url + "posts/markdown-extensions/")
            ready(page)
            graph = page.locator("[data-md-mermaid]").first
            graph.scroll_into_view_if_needed()
            expect(graph).to_have_attribute(
                "data-rendered-theme", "dark", timeout=30000
            )
            assert changed
            # A previously rendered chart hidden during a theme change catches up on reveal.
            graph.evaluate(
                'e=>{const details=document.createElement("details");details.innerHTML="<summary>隐藏图表</summary>";e.before(details);details.append(e)}'
            )
            page.evaluate('NekomiTheme.setMode("light")')
            page.wait_for_timeout(200)
            graph.evaluate("e=>e.parentElement.open=true")
            expect(graph).to_have_attribute(
                "data-rendered-theme", "light", timeout=30000
            )
            # Long inline math must not expand the 320px reading column.
            page.set_viewport_size({"width": 320, "height": 700})
            page.evaluate("""() => {
              const p = document.createElement('p');
              p.append(document.querySelector('#article-body .katex-display:last-of-type .katex')?.cloneNode(true) || [...document.querySelectorAll('#article-body .katex')].at(-1).cloneNode(true));
              document.querySelector('#article-body').append(p);
            }""")
            assert page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth + 1"
            )
            page.set_viewport_size({"width": 1280, "height": 900})
            # A closed Details heading must not become the current TOC section.
            page.locator("#details .heading-anchor").click()
            expect(page.locator("#details")).to_be_focused()
            page.wait_for_function("!NekomiMotion.isScrolling()")
            expect(
                page.locator('#toc-inline-list mdui-list-item[href="#details"]')
            ).to_have_js_property("active", True)
            # Nested native Tabs must keep their keyboard / ARIA scope separate.
            outer = page.locator("[data-md-tabs]").nth(1)
            inner = outer.locator("[data-md-tabs]")
            first = inner.locator(":scope > mdui-tab").first
            first.scroll_into_view_if_needed()
            first.click()
            first.focus()
            page.keyboard.press("ArrowRight")
            expect(inner).to_have_js_property("value", "panel-2")
            expect(outer).to_have_js_property("value", "panel-1")
            expect(first).to_have_attribute("aria-selected", "false")
            expect(inner.locator(":scope > mdui-tab").last).to_be_focused()
            page.keyboard.press("Home")
            expect(inner).to_have_js_property("value", "panel-1")
            expect(first).to_be_focused()
            assert not errors, errors
            c.close()
            b.close()
            print(
                "PASS reading edges: real touch swipe/pinch/pan; linked/single/broken images; reduced motion; leave-open cleanup; theme/loading and hidden diagrams; nested Tabs keyboard",
                flush=True,
            )
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
