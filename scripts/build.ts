#!/usr/bin/env bun
// Build the CLI into dist/cli.mjs targeting Node so the package works with
// bunx, npx and pnpm dlx alike.
import { rmSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

interface PackageMeta {
  name: string;
  version: string;
}

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as PackageMeta;

rmSync(path.join(import.meta.dir, "..", "dist"), {
  recursive: true,
  force: true,
});

const build = await Bun.build({
  entrypoints: [path.join(import.meta.dir, "..", "src", "cli.ts")],
  outdir: "dist",
  target: "node",
  format: "esm",
  minify: true,
  naming: { entry: "[name].mjs" },
  banner: "#!/usr/bin/env node",
});

if (!build.success) {
  for (const log of build.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`${pkg.name}@${pkg.version} -> dist/cli.mjs`);
