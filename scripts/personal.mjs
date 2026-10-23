import { spawnSync } from "node:child_process";
const command = process.argv[2] || "dev";
if (!["dev", "build", "preview"].includes(command))
  throw new Error("Use dev, build or preview.");
const result = spawnSync(
  "npm",
  ["run", command, "--", ...process.argv.slice(3)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEKOMI_CONFIG: "examples/personal/site.config.json",
      NEKOMI_CONTENT_DIR: "examples/demo-posts",
    },
  },
);
process.exit(result.status ?? 1);
