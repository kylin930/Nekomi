"""Browser regression checks for the pinned MDUI 2.1.5 page.

Requires Python Playwright and Chromium. See tests/README.md.
"""
import argparse
import functools
import hashlib
import http.server
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def value(page, expression, expected):
    page.wait_for_function(f"(expected) => ({expression}) === expected", arg=expected)


def selected(page, name):
    value(page, "document.querySelector('#content-tabs').value", name)
    expect(page.locator(f"#panel-{name}")).to_be_visible()
    expect(page.locator(".view-panel:visible")).to_have_count(1)
    expect(page.locator("mdui-tab[aria-selected=true]")).to_have_attribute("value", name)
    expect(page.locator('mdui-tab[tabindex="0"]')).to_have_count(1)


def desktop(page, context, url):
    expect(page.locator("#post-list .post-card")).to_have_count(10)
    for name in ("categories", "tags", "archive", "recent"):
        page.locator(f"#tab-{name}").click()
        selected(page, name)
    page.locator("#tab-recent").focus()
    for key, name in (("ArrowRight", "categories"), ("End", "archive"),
                      ("Home", "recent"), ("ArrowLeft", "archive")):
        page.keyboard.press(key)
        selected(page, name)
        expect(page.locator(f"#tab-{name}")).to_be_focused()
    page.locator("#tab-tags").click()
    page.locator("#tags-list [data-tag]").first.click()
    selected(page, "recent")
    expect(page.locator("#search-view")).to_be_visible()
    page.locator("#tab-recent").focus()
    page.keyboard.press("Enter")
    expect(page.locator("#search-view")).to_be_hidden()
    page.locator("#tab-categories").click()
    page.locator("#tab-archive").click()
    page.go_back()
    selected(page, "categories")
    page.go_forward()
    selected(page, "archive")
    page.goto(url + "#tags", wait_until="networkidle")
    selected(page, "tags")

    dropdown = page.locator(".theme-control--desktop mdui-dropdown")
    trigger = dropdown.locator("[slot=trigger]")
    for mode in ("dark", "auto", "light", "light", "auto", "dark"):
        trigger.click()
        dropdown.locator(f"mdui-menu-item[value={mode}]").click()
        value(page, "NekomiTheme.getMode()", mode)
        page.wait_for_function("""mode => [...document.querySelectorAll('[data-theme-menu]')]
            .every(menu => menu.value === mode &&
                [...menu.children].filter(item => item.selected).length === 1 &&
                menu.querySelector('[selected]').value === mode)""", arg=mode)
    page.reload(wait_until="networkidle")
    value(page, "NekomiTheme.getMode()", "dark")
    value(page, "getComputedStyle(document.documentElement).colorScheme", "dark")
    page.evaluate("NekomiTheme.setMode('auto')")
    for mode in ("dark", "light"):
        page.emulate_media(color_scheme=mode)
        value(page, "getComputedStyle(document.documentElement).colorScheme", mode)
    other = context.new_page()
    other.goto(url)
    other.evaluate("localStorage.setItem('nekomi-theme', 'dark')")
    value(page, "NekomiTheme.getMode()", "dark")
    other.evaluate("localStorage.removeItem('nekomi-theme')")
    value(page, "NekomiTheme.getMode()", "auto")
    other.close()

    # Menu owns keyboard navigation; wait for its asynchronous focus movement.
    for key, mode in (("Home", "light"), ("End", "auto")):
        trigger.click()
        page.wait_for_function("document.activeElement.localName === 'mdui-menu-item'")
        page.keyboard.press(key)
        expect(dropdown.locator(f"mdui-menu-item[value={mode}]")).to_be_focused()
        page.keyboard.press("Enter")
        value(page, "NekomiTheme.getMode()", mode)
        expect(dropdown.locator("mdui-menu")).to_be_hidden()
        expect(trigger.locator("button")).to_be_focused()
    trigger.click()
    page.keyboard.press("Escape")
    expect(dropdown.locator("mdui-menu")).to_be_hidden()
    trigger.click()
    page.locator("#tab-recent").click()
    expect(dropdown.locator("mdui-menu")).to_be_hidden()
    expect(page.locator("#tab-recent")).to_be_focused()

    page.keyboard.press("/")
    field = page.locator("#sidebar-desktop mdui-text-field")
    expect(field.locator("input")).to_be_focused()
    field.locator("input").fill("CSS")
    expect(page.locator("#search-results .post-card")).not_to_have_count(0)
    value(page, "document.querySelector('#sidebar-drawer mdui-text-field').value", "CSS")
    page.keyboard.press("Enter")
    result = page.locator("#search-results [data-post-id]").first
    expect(result).to_be_focused()
    page.keyboard.press("Enter")
    expect(page.locator("#dialog-close button")).to_be_focused()
    page.keyboard.press("/")
    page.wait_for_function("document.querySelector('#post-dialog').contains(document.activeElement)")
    page.keyboard.press("Escape")
    expect(page.locator("#post-dialog")).to_be_hidden()
    expect(result).to_be_focused()
    field.locator("input").fill("no-result-12345")
    expect(page.locator("#search-empty")).to_be_visible()
    field.locator("[part=clear-button]").click()
    expect(page.locator("#search-view")).to_be_hidden()
    expect(field.locator("input")).to_be_focused()
    field.locator("input").fill("CSS")
    page.keyboard.press("Escape")
    expect(page.locator("#search-view")).to_be_hidden()
    for name in ("categories", "archive"):
        page.locator(f"#tab-{name}").click()
        post = page.locator(f"#{name}-list [data-post-id]").first
        post.click()
        expect(page.locator("#dialog-close button")).to_be_focused()
        if name == "categories":
            page.locator("#dialog-close").click()
        else:
            page.locator("#post-dialog [part=overlay]").click(position={"x": 5, "y": 5})
        expect(page.locator("#post-dialog")).to_be_hidden()
        expect(post).to_be_focused()
    print("PASS desktop: tabs, history, search, themes, menu keyboard and dialog")


def mobile(page):
    def open_drawer():
        page.locator("#menu-button").click()
        expect(page.locator("#menu-button")).to_have_attribute("aria-expanded", "true")
        expect(page.locator("#drawer-close button")).to_be_focused()

    def closed():
        expect(page.locator("#mobile-drawer")).to_be_hidden()
        expect(page.locator("#menu-button")).to_have_attribute("aria-expanded", "false")

    open_drawer()
    for key in ("Tab", "Shift+Tab"):
        for _ in range(15):
            page.keyboard.press(key)
            page.wait_for_function("document.querySelector('#mobile-drawer').contains(document.activeElement)")
    page.keyboard.press("Escape")
    closed()
    expect(page.locator("#menu-button button")).to_be_focused()
    open_drawer()
    page.locator("#drawer-close").click()
    closed()
    open_drawer()
    page.locator("#mobile-drawer [part=overlay]").click(position={"x": 380, "y": 500})
    closed()
    page.locator("#tab-recent").focus()
    page.keyboard.press("/")
    field = page.locator("#sidebar-drawer mdui-text-field")
    expect(field.locator("input")).to_be_focused()
    field.locator("input").fill("CSS")
    page.keyboard.press("Enter")
    closed()
    expect(page.locator("#search-results [data-post-id]").first).to_be_focused()
    page.locator("#search-view [data-action=clear-search]").first.click()
    open_drawer()
    page.locator("#sidebar-drawer [data-post-id]").first.click()
    closed()
    expect(page.locator("#dialog-close button")).to_be_focused()
    for _ in range(5):
        page.keyboard.press("Tab")
        page.wait_for_function("document.querySelector('#post-dialog').contains(document.activeElement)")
    page.keyboard.press("Escape")
    expect(page.locator("#post-dialog")).to_be_hidden()
    expect(page.locator("#menu-button button")).to_be_focused()
    open_drawer()
    page.set_viewport_size({"width": 1024, "height": 768})
    closed()
    page.set_viewport_size({"width": 390, "height": 844})
    dropdown = page.locator(".mobile-bar mdui-dropdown")
    dropdown.locator("[slot=trigger]").click()
    dropdown.locator("mdui-menu-item[value=dark]").click()
    value(page, "NekomiTheme.getMode()", "dark")
    print("PASS mobile: modal focus, all drawer close paths, search and theme")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium", default=shutil.which("chromium"))
    parser.add_argument("--verified-cdn", action="store_true",
                        help="Fetch CDN responses with TLS-verifying curl for browser replay")
    parser.add_argument("--artifacts", type=Path,
                        help="Optional directory for viewport screenshots")
    args = parser.parse_args()
    if args.artifacts:
        args.artifacts.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/"
    with tempfile.TemporaryDirectory() as cache, sync_playwright() as p:
        def verified_cdn(route):
            # Preserve proxy/CA configuration and TLS verification. No altered app resources.
            resource = route.request.url
            key = Path(cache) / hashlib.sha256(resource.encode()).hexdigest()
            metadata = key.with_suffix(".type")
            if not key.exists():
                result = subprocess.run([
                    "curl", "--fail", "--location", "--silent", "--show-error",
                    "--compressed", "--max-time", "40", "--user-agent",
                    route.request.headers.get("user-agent", ""), "--output", str(key),
                    "--write-out", "%{content_type}", resource,
                ], check=True, capture_output=True, text=True)
                metadata.write_text(result.stdout)
            route.fulfill(body=key.read_bytes(), headers={
                "content-type": metadata.read_text(),
                "access-control-allow-origin": "*",
            })

        proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
        proxy = {"server": proxy_url, "bypass": "127.0.0.1,localhost"} if proxy_url else None
        browser = p.chromium.launch(executable_path=args.chromium,
                                    args=["--no-sandbox"], proxy=proxy)

        def new_page(**options):
            context = browser.new_context(**options)
            if args.verified_cdn:
                context.route("https://**/*", verified_cdn)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("requestfailed", lambda request: errors.append(request.url))
            page.goto(url, wait_until="networkidle")
            page.wait_for_function("!!customElements.get('mdui-tabs')")
            return context, page, errors

        context, page, errors = new_page(viewport={"width": 1440, "height": 900})
        desktop(page, context, url)
        assert not errors, errors
        context.close()
        context, page, errors = new_page(viewport={"width": 390, "height": 844},
                                         is_mobile=True, has_touch=True)
        mobile(page)
        assert not errors, errors
        context.close()
        for width, height in ((1440, 900), (1024, 768), (901, 768),
                              (900, 768), (390, 844), (320, 700)):
            context, page, errors = new_page(viewport={"width": width, "height": height})
            for mode in ("light", "dark"):
                page.evaluate("mode => NekomiTheme.setMode(mode)", mode)
                value(page, "getComputedStyle(document.documentElement).colorScheme", mode)
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                # Wait for the existing color transitions before judging dark-mode rendering.
                page.wait_for_function(r"""() => {
                    const normalize = value => value.replace(/\s/g, '');
                    const card = getComputedStyle(document.querySelector('.post-card'));
                    const title = getComputedStyle(document.querySelector('.post-title__button'));
                    return normalize(card.backgroundColor) === normalize(card.getPropertyValue('--color-card')) &&
                        normalize(title.color) === normalize(title.getPropertyValue('--color-text'));
                }""")
                if args.artifacts:
                    page.screenshot(path=str(args.artifacts / f"{width}-{mode}.png"), animations="disabled")
            assert not errors, errors
            context.close()
        print("PASS layout: 6 viewport widths in light/dark; no JS or resource failures")
        browser.close()
    server.shutdown()
    server.server_close()


if __name__ == "__main__":
    main()
