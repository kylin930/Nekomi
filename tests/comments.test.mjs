import test from "node:test";
import assert from "node:assert/strict";
import { resolveConfig } from "../src/config/schema.mjs";
import { commentKey } from "../src/integrations/comments/identity.ts";
import { assets } from "../src/integrations/comments/catalog.ts";
const post = (id, data = {}) => ({ id, data });
test("comment identity is independent of title, origin and deployment base", () => {
  assert.equal(
    commentKey(post("hello", { title: "旧标题" }), "/posts/"),
    "/posts/hello/",
  );
  assert.equal(
    commentKey(
      post("renamed", { title: "新标题", commentId: "hello" }),
      "/posts/",
    ),
    "/posts/hello/",
  );
  assert.equal(
    commentKey(post("中文"), "/notes/"),
    "/notes/%E4%B8%AD%E6%96%87/",
  );
});
test("an explicit legacy path preserves the old key", () =>
  assert.equal(
    commentKey(post("new", { commentPath: "/Nekomi/old.html" }), "/posts/"),
    "/Nekomi/old.html",
  ));
test("providers remain opt-in and static examples are not a dynamic service", () => {
  const c = resolveConfig({});
  assert.equal(c.comments.provider, "none");
  assert.deepEqual(c.comments.items, []);
});
for (const provider of ["waline", "twikoo", "giscus", "artalk", "custom"])
  test(provider + " requires its public connection settings", () =>
    assert.throws(
      () => resolveConfig({ comments: { provider } }),
      new RegExp("comments." + provider),
    ),
  );
for (const [provider, data] of [
  ["waline", { serverURL: "https://comments.example" }],
  ["twikoo", { envId: "https://comments.example" }],
  [
    "giscus",
    {
      repo: "user/repo",
      repoId: "public-id",
      category: "Comments",
      categoryId: "public-category",
    },
  ],
  ["artalk", { server: "https://comments.example", site: "My blog" }],
  ["custom", { module: "./examples/comments/rest-adapter.ts" }],
])
  test(provider + " accepts minimal documented settings", () =>
    assert.equal(
      resolveConfig({ comments: { provider, [provider]: data } }).comments
        .provider,
      provider,
    ),
  );
for (const comments of [
  { provider: "waline", waline: { serverURL: "not a URL" } },
  {
    provider: "artalk",
    artalk: { server: "https://comments.example?admin=1", site: "Blog" },
  },
  {
    provider: "waline",
    waline: { serverURL: "https://user:secret@comments.example" },
  },
  { provider: "custom", custom: { module: "./src/../outside.ts" } },
  {
    provider: "artalk",
    artalk: { server: "javascript:alert(1)", site: "blog" },
  },
  {
    provider: "waline",
    waline: { serverURL: "https://comments.example", adminToken: "private" },
  },
  { timeout: 0 },
  { recentLimit: 100 },
  { assets: { script: "javascript:alert(1)" } },
])
  test(
    "rejects invalid/private browser settings " + JSON.stringify(comments),
    () => assert.throws(() => resolveConfig({ comments }), /comments/),
  );
test("official SDK versions are pinned and supplied with integrity hashes", () => {
  for (const a of Object.values(assets)) {
    assert.match(a.script, /@\d+\.\d+\.\d+\//);
    assert.match(a.integrity, /^sha384-/);
  }
});
