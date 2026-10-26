import { z } from "astro/zod";
import { defaultUI } from './messages.mjs';
import { validPageSlug } from '../lib/page-rules.mjs';
import { validScriptSource, validScriptPath, scriptSourceKey } from '../integrations/scripts/urls.mjs';
// Shared by astro.config, Content Collections and server components. No browser bundle.
const text = (fallback = "") => z.string().max(1000).default(fallback);
const flag = (fallback = true) => z.boolean().default(fallback);
/** @template {import('astro/zod').z.ZodRawShape} T @param {T} shape */
const section = (shape) => z.strictObject(shape).prefault({});
const color = z
  .string()
  .regex(/^#[\da-f]{6}$/i, "Use a six-digit hex color, e.g. #8064b1.");
const image = z
  .string()
  .max(2048)
  .refine((v) => {
    if (!v) return true;
    if (/^https?:\/\//.test(v)) {
      try {
        const u = new URL(v);
        return !u.username && !u.password;
      } catch {
        return false;
      }
    }
    return (
      !v.startsWith("//") && !/[<>:\\]/.test(v) && !v.split("/").includes("..")
    );
  }, "Use an HTTP(S) URL or a local image path without ../ segments.")
  .default("");
const link = z
  .string()
  .max(2048)
  .refine(
    (v) => /^(https?:\/\/[^\s]+|mailto:[^\s]+|\/(?!\/)[^\s]*)$/.test(v),
    "Use an HTTP(S), mailto: or site-relative / URL.",
  );
const web = z.url({ protocol: /^https?$/ });
const serviceUrl = web.refine((value) => {
  try {
    const u = new URL(value);
    return !u.username && !u.password && !u.search && !u.hash;
  } catch {
    return false;
  }
}, "Use a public HTTP(S) service base URL without credentials, query or hash.");
const font = z
  .string()
  .min(1)
  .max(256)
  .regex(
    /^[^;{}<>@\n\r\\]+$/,
    "Use a CSS font-family stack, without CSS declarations.",
  );
/** @template {import('astro/zod').z.ZodType} T @param {T} schema */
const unique = (schema) =>
  z.array(schema).superRefine((items, ctx) => {
    if (
      new Set(items.map((v) => (typeof v === "string" ? v : v.id))).size !==
      items.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Entries must have unique IDs.",
      });
  });
const tab = z.enum(["recent", "categories", "tags", "archive"]);
const sidebarTab = z.enum(["updates", "friends", "comments"]);
const scriptFields = {
  src: z.string().refine(validScriptSource, 'Use a public local .js/.mjs file or a credential-free HTTPS JavaScript URL.'),
  type: z.enum(['module', 'classic']).default('module'),
  position: z.enum(['head', 'body-end']).default('body-end'),
  enabled: flag(),
  integrity: z.string().regex(/^(?:|sha(?:256|384|512)-[A-Za-z0-9+/=]+)$/).default(''),
};
// Decorations are optional public resources; remote sources must use HTTPS.
const decorationImage = image.refine(
  (value) => !value.startsWith("http:"),
  "Use an HTTPS URL or a public/ image path for decorations.",
);
/** @param {number} width */
const decoration = (width) => section({
  enabled: flag(false),
  light: decorationImage,
  dark: decorationImage,
  width: z.number().int().min(64).max(320).default(width),
  opacity: z.number().min(0).max(1).default(0.85),
  offsetX: z.number().int().min(-64).max(64).default(0),
  offsetY: z.number().int().min(-64).max(64).default(0),
  align: z.enum(["right", "center"]).default("right"),
  mobile: flag(false),
});
export const originSchema = z.string().refine((value) => {
  if (!value) return true;
  try {
    const u = new URL(value);
    return (
      ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash
    );
  } catch {
    return false;
  }
}, "Use an HTTP(S) origin without a path; put the path in publishing.base.");
export const baseSchema = z
  .string()
  .regex(/^\/(?:[\w.~\-]+\/)*$/, "Start and end with /, e.g. /Nekomi/.")
  .refine(
    (value) => !value.split("/").some((part) => part === "." || part === ".."),
    "Do not use . or .. path segments.",
  );
const languageSchema = z.string().refine((value) => {
  try {
    new Intl.Locale(value);
    return true;
  } catch {
    return false;
  }
}, "Use a valid BCP 47 language, e.g. zh-CN.");
const timeZone = z.string().refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}, 'Use a valid IANA time zone, e.g. Asia/Shanghai or America/New_York.');
/** @param {string} value */
const placeholders = value => [...new Set(value.match(/\{\w+\}/g) || [])].sort().join(',');
/** @param {string} fallback */
function messageSchema(fallback) {
  return z.string().min(1).max(500)
    .refine(value => Boolean(value.trim()), 'Use non-empty UI text; hide modules using their layout switches.')
    .refine(value => placeholders(value) === placeholders(fallback), `Keep the same placeholders as: ${fallback}`)
    .default(fallback);
}
const uiSchema = section(Object.fromEntries(
  Object.entries(defaultUI).map(([group, entries]) => [
    group,
    section(Object.fromEntries(Object.entries(entries).map(([key, fallback]) => [key, messageSchema(fallback)]))),
  ]),
));

export const readingSchema = z.strictObject({
  lightbox: z.boolean().optional(),
  readingTime: z.boolean().optional(),
  related: z.boolean().optional(),
  toc: z.boolean().optional(),
  copyCode: z.boolean().optional(),
  cover: z.boolean().optional(),
  metadata: z.boolean().optional(),
  neighbors: z.boolean().optional(),
  motion: z.boolean().optional(),
});
export const configSchema = section({
  $schema: z.string().optional(),
  demo: flag(true),
  demoNotice: text("示例内容，请替换为自己的文章。"),
  ui: uiSchema,
  site: section({
    name: z.string().min(1).max(80).default("Nekomi"),
    tagline: text("分享技术、日常"),
    intro: text(),
    avatar: image,
    favicon: image,
    appleTouchIcon: image,
    avatarAlt: text("站点头像"),
    avatarFallback: z.string().max(2).default("N"),
    email: z.union([z.literal(""), z.email()]).default(""),
    social: z
      .array(
        z.strictObject({
          name: z.string().min(1).max(40),
          url: link,
          icon: z
            .string()
            .regex(/^[\w-]+$/)
            .default("auto"),
        }),
      )
      .default([]),
  }),
  publishing: section({
    url: originSchema.default(""),
    base: baseSchema.default("/"),
    language: languageSchema.default("zh-CN"),
    timeZone: timeZone.default('Asia/Shanghai'),
    indexing: flag(false),
    pageSize: z.number().int().min(2).max(24).default(6),
    author: text(),
    authorUrl: z.union([z.literal(""), web]).default(""),
    socialImage: image,
  }),
  appearance: section({
    preset: z.enum(["default", "fresh", "minimal"]).default("default"),
    color: color.default("#8064b1"),
    secondary: z.union([z.literal(""), color]).default(""),
    mode: z.enum(["auto", "light", "dark"]).default("auto"),
    font: font.default(
      '"Segoe UI", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    ),
    brandFont: font.default(
      '"Avenir Next", "Hiragino Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    ),
    headingFont: font.default(
      '"Noto Serif CJK SC", "Songti SC", "STSong", ui-serif, serif',
    ),
    webFonts: z.array(z.strictObject({
      family: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} ._-]+$/u, 'Use a plain font-family name.'),
      src: image.unwrap().refine(value => Boolean(value) && !value.startsWith('http:') && /\.woff2(?:\?[^#]*)?$/i.test(value), 'Use a local or HTTPS .woff2 file.'),
      weight: z.string().regex(/^(?:[1-9]\d{0,2}|1000)(?: (?:[1-9]\d{0,2}|1000))?$/).refine(value => { const parts = value.split(' ').map(Number); return parts.length === 1 || parts[0] <= parts[1]; }, 'Use one weight or an ascending range.').default('400'),
      style: z.enum(['normal', 'italic']).default('normal'),
      preload: flag(false),
    })).max(6).default([]),
    semanticColors: section({ success: color.default('#357b54'), warning: color.default('#946b00') }),
    radius: z.number().int().min(8).max(28).default(20),
    wallpaper: section({
      enabled: flag(false),
      light: image,
      dark: image,
      mobileLight: image,
      mobileDark: image,
      position: z
        .string()
        .max(80)
        .regex(/^[\w.% -]+$/)
        .default("center"),
      fit: z.enum(["cover", "contain"]).default("cover"),
      lightOverlay: z.number().min(0).max(1).default(0.6),
      darkOverlay: z.number().min(0).max(1).default(0.68),
      lightSurface: z.number().min(0.65).max(1).default(0.84),
      darkSurface: z.number().min(0.65).max(1).default(0.88),
      lightReaderSurface: z.number().min(0.85).max(1).default(0.97),
      darkReaderSurface: z.number().min(0.85).max(1).default(0.97),
      cacheHours: z.number().min(0).max(168).default(24),
    }),
    decorations: section({ sidebar: decoration(200), comments: decoration(144) }),
  }),
  layout: section({
    backToTop: flag(),
    sidebarSections: z.array(z.discriminatedUnion('display', [
      z.strictObject({ id: sidebarTab, display: z.literal('tab') }),
      z.strictObject({ id: sidebarTab, display: z.literal('standalone'), position: z.enum(['above', 'below']).default('below') }),
    ])).max(3).refine(items => new Set(items.map(item => item.id)).size === items.length, 'Each sidebar section must have a unique id.').nullable().default(null),
    width: z.number().int().min(1360).max(1600).default(1440),
    readerWidth: z.number().int().min(680).max(800).default(760),
    sidebarWidth: z.number().int().min(280).max(320).default(320),
    recentPostsLimit: z.number().int().min(0).max(12).default(5),
    friendsPreviewLimit: z.number().int().min(0).max(12).default(5),
    modules: unique(z.enum(["profile", "social", "search", "tabs"])).default([
      "profile",
      "social",
      "search",
      "tabs",
    ]),
    sidebarTabs: unique(sidebarTab).default(["updates", "friends", "comments"]),
  }),
  scripts: section({
    global: z.array(z.strictObject(scriptFields)).max(16).default([]),
    byPage: z.array(z.strictObject({ path: z.string().refine(validScriptPath, 'Use a site-root path with trailing slash, without deployment base/query/hash.'), ...scriptFields })).max(32).default([]),
  }),
  navigation: section({
    pageTabs: z.array(z.strictObject({ slug: z.string().refine(validPageSlug, 'Use a non-reserved page slug without leading/trailing slashes.'), label: z.string().trim().min(1).max(20), enabled: flag() })).max(8).refine(items => new Set(items.map(item => item.slug)).size === items.length, 'Page tabs must have unique slugs/IDs.').default([]),
    tabs: unique(
      z.strictObject({
        id: tab,
        label: z.string().min(1).max(12),
        enabled: flag(),
      }),
    ).default([
      { id: "recent", label: "全部文章", enabled: true },
      { id: "categories", label: "分类", enabled: true },
      { id: "tags", label: "标签", enabled: true },
      { id: "archive", label: "归档", enabled: true },
    ]),
    links: z
      .array(z.strictObject({ label: z.string().min(1).max(40), url: link }))
      .default([]),
    topLinks: z.array(z.strictObject({ label: z.string().trim().min(1).max(40), url: link, enabled: flag(), newTab: flag(false) })).max(12).default([]),
  }),
  home: section({
    eyebrow: text(),
    description: text(),
    emptyTitle: text("暂无文章"),
    emptyDescription: text(),
  }),
  cards: section({
    example: flag(),
    pinned: flag(),
    cover: z.enum(["auto", "top", "none"]).default("auto"),
    excerpt: flag(),
    date: flag(),
    category: flag(),
    tags: flag(),
    readMore: flag(),
    latest: flag(),
  }),
  reading: section({
    lightbox: flag(),
    readingTime: flag(),
    related: flag(),
    relatedLimit: z.number().int().min(0).max(6).default(3),
    toc: flag(),
    copyCode: flag(),
    cover: flag(),
    metadata: flag(),
    neighbors: flag(),
    motion: flag(),
  }),
  markdown: section({ math: flag(), mermaid: flag(), components: flag() }),
  friendsPage: section({ enabled: flag(), navigation: flag(false) }),
  content: section({
    defaultCategory: z.string().trim().min(1).max(100).default('未分类'),
    categoryColors: z.record(z.string().min(1).max(100).refine(key => key.trim() === key, 'Use an exact category name without surrounding whitespace.'), z.union([z.enum(['primary', 'secondary', 'tertiary', 'error', 'success', 'warning']), color])).refine(value => Object.keys(value).length <= 64, 'Use at most 64 category color entries.').default({}),
    categoryPreviewLimit: z.number().int().min(0).max(12).default(3),
    archivePreviewLimit: z.number().int().min(0).max(12).default(3),
    infiniteScroll: flag(),
    excerptLength: z.number().int().min(40).max(400).default(140),
    categories: flag(),
    tags: flag(),
  }),
  features: section({ search: flag(), rss: flag(), sitemap: flag() }),
  footer: section({
    enabled: flag(),
    since: z.number().int().min(1970).max(2100).default(2026),
    text: text(),
    copyright: text(),
    links: z
      .array(z.strictObject({ label: z.string().min(1).max(40), url: link }))
      .default([]),
  }),
  friends: z
    .array(
      z.strictObject({
        name: z.string().min(1),
        url: web,
        avatar: image,
        description: text(),
      }),
    )
    .default([]),
  comments: section({
    provider: z
      .enum(["none", "link", "waline", "twikoo", "giscus", "artalk", "custom"])
      .default("none"),
    lazy: flag(),
    counts: flag(),
    recent: flag(),
    recentLimit: z.number().int().min(1).max(10).default(4),
    timeout: z.number().int().min(3000).max(60000).default(15000),
    keyPrefix: baseSchema.default("/posts/"),
    pageKeyPrefix: baseSchema.default('/pages/'),
    waline: section({
      serverURL: z.union([z.literal(""), serviceUrl]).default(""),
      lang: text("zh-CN"),
      login: z.enum(["enable", "disable", "force"]).default("enable"),
    }),
    twikoo: section({
      envId: z
        .union([z.literal(""), serviceUrl, z.string().regex(/^[\w.-]{1,180}$/)])
        .default(""),
      region: text(),
      lang: text("zh-CN"),
    }),
    giscus: section({
      repo: z
        .string()
        .regex(/^(?:[\w.-]+\/[\w.-]+)?$/)
        .default(""),
      repoId: text(),
      category: text(),
      categoryId: text(),
      lang: text("zh-CN"),
      reactions: flag(),
    }),
    artalk: section({
      server: z.union([z.literal(""), serviceUrl]).default(""),
      site: text(),
      locale: text("zh-CN"),
    }),
    custom: section({
      module: z
        .string()
        .regex(/^(?:|\.\/(?:[\w.-]+\/)*[\w.-]+\.(?:ts|js|mjs))$/)
        .default(""),
      options: z.record(z.string(), z.json()).default({}),
    }),
    assets: section({
      script: image,
      css: image,
      integrity: z
        .string()
        .regex(/^(?:|sha(?:256|384|512)-[A-Za-z0-9+/=]+)$/)
        .default(""),
      cssIntegrity: z
        .string()
        .regex(/^(?:|sha(?:256|384|512)-[A-Za-z0-9+/=]+)$/)
        .default(""),
    }),
    anchorsEnabled: flag(false),
    items: z
      .array(
        z.strictObject({
          id: z.string().min(1),
          author: z.string().min(1),
          avatar: image,
          excerpt: z.string(),
          postId: z.string(),
          createdAt: z.iso.datetime({ offset: true }),
          anchor: z.string().optional(),
          demo: flag(false),
        }),
      )
      .default([]),
  }),
  analytics: section({
    enabled: flag(false),
    provider: z.literal("umami").default("umami"),
    scriptUrl: z.union([z.literal(""), web]).default(""),
    websiteId: z
      .string()
      .max(100)
      .regex(/^[\w-]*$/)
      .default(""),
  }),
}).superRefine((value, ctx) => {
  const sources = new Map();
  const targets = new Set();
  for (const [scope, entries] of Object.entries(value.scripts)) for (const [index, entry] of entries.entries()) {
    if (!validScriptSource(entry.src)) continue;
    const key = scriptSourceKey(entry.src);
    const path = scope === 'global' ? '*' : entry.path;
    const target = path + '\n' + key;
    const previous = sources.get(key);
    if (targets.has(target) || previous && (previous.scope !== scope || previous.type !== entry.type || previous.integrity !== entry.integrity || previous.position !== entry.position)) ctx.addIssue({ code: 'custom', path: ['scripts', scope, index], message: 'Duplicate/conflicting script resource or global/page scope. Reuse one declaration with consistent type, position and integrity.' });
    targets.add(target); sources.set(key, { ...entry, scope });
  }
  const required = {
    waline: ["serverURL"],
    twikoo: ["envId"],
    giscus: ["repo", "repoId", "category", "categoryId"],
    artalk: ["server", "site"],
    custom: ["module"],
  };
  const provider = value.comments.provider;
  for (const field of required[provider] || [])
    if (!value.comments[provider][field]?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["comments", provider, field],
        message: `Required when comments.provider is ${provider}.`,
      });
  if (value.comments.custom.module.split("/").includes(".."))
    ctx.addIssue({
      code: "custom",
      path: ["comments", "custom", "module"],
      message: "Use a module inside this project, without ../ segments.",
    });
  if (!value.navigation.tabs.some((t) => t.id === "recent" && t.enabled))
    ctx.addIssue({
      code: "custom",
      path: ["navigation", "tabs"],
      message:
        "The recent (all articles) tab must remain enabled for search and pagination.",
    });
  if (
    value.analytics.enabled &&
    (!value.analytics.scriptUrl || !value.analytics.websiteId)
  )
    ctx.addIssue({
      code: "custom",
      path: ["analytics"],
      message: "Enabled Umami requires scriptUrl and websiteId.",
    });
});
export const presets = {
  default: {},
  fresh: { color: "#427f79", secondary: "#76844c", radius: 24 },
  minimal: {
    color: "#596477",
    radius: 12,
    headingFont: 'system-ui, "PingFang SC", sans-serif',
  },
};
export function resolveConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error(
      "Invalid Nekomi configuration: config must be a JSON object.",
    );
  const appearance = input.appearance === undefined ? {} : input.appearance;
  const parsed = configSchema.safeParse({
    ...input,
    appearance:
      appearance && typeof appearance === "object" && !Array.isArray(appearance)
        ? { ...presets[appearance.preset], ...appearance }
        : appearance,
  });
  if (!parsed.success)
    throw new Error(
      "Invalid Nekomi configuration:\n" +
        parsed.error.issues
          .map((i) => `  ${i.path.join(".") || "config"}: ${i.message}`)
          .join("\n"),
    );
  return parsed.data;
}
