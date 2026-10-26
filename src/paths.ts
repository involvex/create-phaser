import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Locate the bundled templates/ directory.
 *
 * Works both when the source is run directly (bun src/cli.ts) and when the
 * built dist/cli.mjs is running inside the published package: in both cases
 * templates/ is a sibling of the package root, so we walk up from
 * import.meta.url until we find it.
 */
export function resolveTemplatesDir(from?: string): string {
  let dir = from ?? dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 10; depth++) {
    const candidate = join(dir, "templates");
    if (existsSync(join(candidate, ".keep"))) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    "Could not locate the bundled templates directory (templates/). The package appears to be installed incompletely.",
  );
}
