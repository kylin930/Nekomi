import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveConfig } from "../src/config/schema.mjs";
const read = (file) =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
test("portable defaults have no personal identity, remote wallpaper or external script", () => {
  const c = resolveConfig({});
  assert.equal(c.site.name, "Nekomi");
  assert.equal(c.appearance.wallpaper.enabled, false);
  assert.equal(c.appearance.wallpaper.light, "");
  assert.equal(c.analytics.enabled, false);
  assert.equal(c.demo, true);
  assert.equal(c.publishing.indexing, false);
});
test("partial nested values retain validated defaults", () => {
  const c = resolveConfig({
    appearance: { wallpaper: { lightOverlay: 0.4 } },
    site: { name: "新站点" },
  });
  assert.equal(c.appearance.wallpaper.darkSurface, 0.88);
  assert.equal(c.site.name, "新站点");
});
test("brand typography is independent of body and heading fonts", () => {
  const c = resolveConfig({ appearance: { brandFont: 'Verdana, sans-serif', font: 'Arial, sans-serif', headingFont: 'Georgia, serif' } });
  assert.equal(c.appearance.brandFont, 'Verdana, sans-serif');
  assert.equal(c.appearance.headingFont, 'Georgia, serif');
  assert.equal(c.appearance.font, 'Arial, sans-serif');
  assert.throws(() => resolveConfig({ appearance: { brandFont: 'serif; color:red' } }), /appearance.brandFont/);
});
test("default public copy is minimal and legacy home settings remain valid", () => {
  const c = resolveConfig({ home: { eyebrow: '旧配置', description: '自定义描述' } });
  assert.equal(c.site.intro, '');
  assert.equal(c.footer.text, '');
  assert.equal(c.home.emptyTitle, '暂无文章');
  assert.equal(c.home.eyebrow, '旧配置');
  assert.equal(c.home.description, '自定义描述');
});
test("presets use one token model; explicit user overrides win without mutating input", () => {
  const input = { appearance: { preset: "fresh", radius: 18 } };
  const before = JSON.stringify(input);
  const c = resolveConfig(input);
  assert.equal(c.appearance.color, "#427f79");
  assert.equal(c.appearance.radius, 18);
  assert.equal(JSON.stringify(input), before);
  assert.equal(
    resolveConfig({ appearance: { preset: "minimal" } }).appearance.radius,
    12,
  );
});
for (const [name, value, path] of [
  ["unknown section", { typo: true }, "Unrecognized"],
  ["unknown field", { site: { typo: true } }, "site"],
  ["unknown preset", { appearance: { preset: "magic" } }, "appearance.preset"],
  [
    "unsafe CSS",
    { appearance: { font: "serif; color:red" } },
    "appearance.font",
  ],
  [
    "unsupported color",
    { appearance: { color: "purple" } },
    "appearance.color",
  ],
  [
    "oversized sidebar",
    { layout: { sidebarWidth: 800 } },
    "layout.sidebarWidth",
  ],
  ["undersized page", { publishing: { pageSize: 1 } }, "publishing.pageSize"],
  [
    "duplicate modules",
    { layout: { modules: ["profile", "profile"] } },
    "layout.modules",
  ],
  ["missing all-articles tab", { navigation: { tabs: [] } }, "navigation.tabs"],
  [
    "script social URL",
    { site: { social: [{ name: "X", url: "javascript:alert(1)" }] } },
    "site.social",
  ],
  [
    "unsafe wallpaper URL",
    { appearance: { wallpaper: { light: "data:image/png;base64,hi" } } },
    "appearance.wallpaper.light",
  ],
  [
    "asset path traversal",
    { site: { avatar: "../outside.jpg" } },
    "site.avatar",
  ],
  ["incomplete analytics", { analytics: { enabled: true } }, "analytics"],
])
  test(name + " fails with actionable field path", () =>
    assert.throws(
      () => resolveConfig(value),
      new RegExp(String(path).replaceAll(".", "\\.")),
    ),
  );
for (const file of [
  "../site.config.json",
  "../examples/site.config.json",
  "../examples/fresh.config.json",
  "../examples/minimal.config.json",
  "../examples/full.config.json",
  "../examples/decorations.config.json",
  "../examples/personal/site.config.json",
])
  test("valid example " + file, () => assert.ok(resolveConfig(read(file))));
test("all optional modules can be disabled", () => {
  const c = resolveConfig({
    layout: { modules: [], sidebarTabs: [] },
    features: { search: false },
    reading: { toc: false, copyCode: false },
  });
  assert.deepEqual(c.layout.modules, []);
  assert.equal(c.reading.toc, false);
});
for (const [path, value] of [
  ["url", "https://example.com/blog/"],
  ["url", "javascript:hi"],
  ["url", "https://user:pass@example.com"],
  ["base", "/foo/../"],
  ["base", "Nekomi"],
  ["language", "not_a_locale"],
])
  test("invalid publishing." + path + ": " + value, () =>
    assert.throws(
      () => resolveConfig({ publishing: { [path]: value } }),
      new RegExp("publishing\\." + path),
    ),
  );
test("dotted repository base is valid", () =>
  assert.equal(
    resolveConfig({ publishing: { base: "/my.blog/" } }).publishing.base,
    "/my.blog/",
  ));
test("configuration must be an object", () =>
  assert.throws(() => resolveConfig(null), /JSON object/));

test("null appearance does not silently become defaults", () =>
  assert.throws(() => resolveConfig({ appearance: null }), /appearance/));

test('P3.1 reading and Markdown defaults remain separately configurable', () => {
  const c = resolveConfig({ reading: { relatedLimit: 0 }, markdown: { mermaid: false }, friendsPage: { navigation: true } });
  assert.equal(c.reading.lightbox, true);
  assert.equal(c.reading.readingTime, true);
  assert.equal(c.reading.relatedLimit, 0);
  assert.deepEqual(c.markdown, { math: true, mermaid: false, components: true });
  assert.deepEqual(c.friendsPage, { enabled: true, navigation: true });
  for (const relatedLimit of [-1, 7, 1.5]) assert.throws(() => resolveConfig({ reading: { relatedLimit } }), /reading.relatedLimit/);
  assert.throws(() => resolveConfig({ markdown: { math: 'yes' } }), /markdown.math/);
});

test('decorations and icon defaults leave the existing layout and network untouched', () => {
  const c = resolveConfig({});
  assert.equal(c.site.favicon, '');
  assert.equal(c.site.appleTouchIcon, '');
  for (const kind of ['sidebar', 'comments']) {
    assert.equal(c.appearance.decorations[kind].enabled, false);
    assert.equal(c.appearance.decorations[kind].mobile, false);
    assert.equal(c.appearance.decorations[kind].light, '');
  }
  assert.equal(c.appearance.wallpaper.mobileLight, '');
  assert.equal(c.appearance.wallpaper.mobileDark, '');
  assert.equal(c.layout.recentPostsLimit, 5);
  assert.equal(c.layout.friendsPreviewLimit, 5);
});

test('decoration ranges, public sources and preview limits are validated', () => {
  const c = resolveConfig({ appearance: { decorations: { sidebar: { enabled: true, light: '/images/character.webp', dark: 'https://example.com/dark.png', mobile: true, align: 'center', offsetX: -12, offsetY: 24 } }, wallpaper: { mobileLight: '/images/mobile.jpg' } }, layout: { recentPostsLimit: 0, friendsPreviewLimit: 12 }, site: { favicon: '/favicon.svg', appleTouchIcon: 'https://example.com/touch.png' } });
  assert.equal(c.appearance.decorations.sidebar.width, 200);
  assert.equal(c.appearance.decorations.comments.enabled, false);
  assert.equal(c.layout.recentPostsLimit, 0);
  for (const [field, value] of Object.entries({ width: 321, opacity: 1.1, offsetX: -65, offsetY: 65, align: 'left', light: 'http://example.com/image.png', dark: 'javascript:alert(1)' })) {
    assert.throws(() => resolveConfig({ appearance: { decorations: { comments: { [field]: value } } } }), new RegExp('appearance.decorations.comments.' + field));
  }
  for (const key of ['recentPostsLimit', 'friendsPreviewLimit']) for (const value of [-1, 13, 1.5]) assert.throws(() => resolveConfig({ layout: { [key]: value } }), new RegExp('layout.' + key));
  assert.throws(() => resolveConfig({ site: { favicon: 'data:image/svg+xml,bad' } }), /site.favicon/);
  assert.throws(() => resolveConfig({ appearance: { wallpaper: { mobileDark: '../bad.jpg' } } }), /appearance.wallpaper.mobileDark/);
});
