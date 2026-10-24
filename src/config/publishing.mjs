import { readFileSync } from "node:fs";
import defaultConfig from "../../site.config.json" with { type: "json" };
import { resolveConfig } from "./schema.mjs";

// Alternate files inherit theme defaults, not another user's site.config.json.
let input = defaultConfig;
if (process.env.NEKOMI_CONFIG) {
  try {
    input = JSON.parse(readFileSync(process.env.NEKOMI_CONFIG, "utf8"));
  } catch (error) {
    throw new Error(
      `Cannot read Nekomi config ${process.env.NEKOMI_CONFIG}: ${error.message}`,
    );
  }
}
if (!input || typeof input !== "object" || Array.isArray(input))
  throw new Error(
    "Invalid Nekomi configuration: config must be a JSON object.",
  );
// Environment overrides pass through the same schema and actionable field errors.
export const rawConfig = resolveConfig({
  ...input,
  publishing: {
    ...input?.publishing,
    ...(process.env.SITE_URL !== undefined
      ? { url: process.env.SITE_URL }
      : {}),
    ...(process.env.SITE_BASE !== undefined
      ? { base: process.env.SITE_BASE }
      : {}),
  },
});
const options = rawConfig.publishing;
const language = new Intl.Locale(options.language);
export const publishing = {
  ...options,
  url: options.url ? new URL(options.url).origin : "",
  language: language.toString(),
  ogLocale: language.region ? language.language + "_" + language.region : "",
  indexing: options.indexing && Boolean(options.url) && !rawConfig.demo,
  author: options.author || rawConfig.site.name,
};
