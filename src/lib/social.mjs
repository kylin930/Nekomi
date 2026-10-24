/** Brand names are explicit icons; auto detection only trusts actual platform hosts. */
export function socialIcon({ icon = "auto", url }) {
  if (icon !== "auto") return icon;
  try {
    const target = new URL(url, "https://nekomi.invalid");
    if (target.protocol === "mailto:") return "mail--outlined";
    const host = target.hostname.toLowerCase();
    if (host === "github.com" || host.endsWith(".github.com")) return "github";
    if (host === "bilibili.com" || host.endsWith(".bilibili.com") || host === "b23.tv") return "bilibili";
  } catch { /* The config schema reports invalid URLs before rendering. */ }
  return "link";
}
