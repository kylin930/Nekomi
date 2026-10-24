"""Verify Astro lightbox assets outside src/, including a cached second build."""

import shutil
from playwright.sync_api import sync_playwright, expect
from browser_audit import ROOT, start_server
from browse_audit import external_routes
from theme_audit import ARTIFACTS, build
from reading_audit import ready


def main():
    folder = ARTIFACTS / "p31-external-images"
    folder.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / "src/assets/images/demo-home.png", folder / "outside.png")
    (folder / "external.md").write_text("""---
title: 临时外部内容目录图片
date: '2026-01-01'
demo: true
---

![相对本地图片](./outside.png "项目自有截图")
""")
    config = {
        "markdown": {"math": False, "mermaid": False, "components": False},
        "friendsPage": {"enabled": False},
    }
    for _ in range(2):
        dist = build("p31-external-image-build", config, folder)
    server, url = start_server(dist, "/")
    try:
        html = (dist / "posts/external/index.html").read_text()
        assert "data-nekomi-source" not in html and str(ROOT) not in html
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=shutil.which("chromium"), args=["--no-sandbox"]
            )
            context = browser.new_context(service_workers="block")
            external_routes(context, "/tmp/nekomi-p11/cdn")
            page = context.new_page()
            page.goto(url + "posts/external/")
            ready(page)
            image = page.locator("#article-body img")
            expect(image).to_have_js_property("complete", True)
            assert (
                image.get_attribute("srcset") and image.get_attribute("width") == "1440"
            )
            original = image.get_attribute("data-original-src")
            assert (
                original.endswith(".png")
                and context.request.get(url.rstrip("/") + original).status == 200
            )
            image.click()
            expect(page.get_by_role("dialog", name="图片查看器")).to_be_focused(
                timeout=10000
            )
            expect(page.locator(".pswp__counter")).to_have_text("1 / 1")
            assert not page.locator(".pswp__error-msg").count()
            page.keyboard.press("Escape")
            expect(image).to_be_focused()
            browser.close()
        print(
            "PASS external-content image: responsive WebP plus full-size PNG survives fresh/cached builds; viewer loads original",
            flush=True,
        )
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
