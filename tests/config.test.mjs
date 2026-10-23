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
