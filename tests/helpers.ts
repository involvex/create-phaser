import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { getTemplate } from "../src/registry";
import { resolveTemplatesDir } from "../src/paths";
import type { TemplateInfo } from "../src/types";

/**
 * Shared contract for every bundled template. Individual template test files
 * call registerTemplateTests(getTemplate("<id>")!, [ ...extraFiles ]).
 */

export const TEMPLATE_FILES: readonly string[] = [
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "README.md",
  "_gitignore",
  "src/main.ts",
  "src/config.ts",
];

/** Templates ship no binary assets: every file must be one of these text types. */
const ALLOWED_TEXT_EXTENSIONS = new Set([
  ".md",
  ".html",
  ".json",
  ".ts",
  ".css",
  ".txt",
]);

export function templateDir(id: string): string {
  return join(resolveTemplatesDir(), id);
}

export function listFiles(dir: string): string[] {
  const files: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        files.push(full);
      }
    }
  };
  walk(dir);
  return files;
}

export function registerTemplateTests(
  info: TemplateInfo,
  extraFiles: readonly string[] = [],
): void {
  describe(`template: ${info.id}`, () => {
    it("is registered in src/registry.ts", () => {
      expect(getTemplate(info.id)).toBeDefined();
    });

    it("has all required files", () => {
      const dir = templateDir(info.id);
      expect(existsSync(dir), `templates/${info.id} must exist`).toBe(true);
      for (const file of [...TEMPLATE_FILES, ...extraFiles]) {
        expect(
          existsSync(join(dir, file)),
          `missing templates/${info.id}/${file}`,
        ).toBe(true);
      }
    });

    it("has a valid {{projectName}} package.json with the shared scripts", () => {
      const pkg = JSON.parse(
        readFileSync(join(templateDir(info.id), "package.json"), "utf8"),
      ) as Record<string, any>;
      expect(pkg.name).toBe("{{projectName}}");
      expect(pkg.private).toBe(true);
      expect(pkg.scripts.dev).toBe("vite");
      expect(pkg.scripts.build).toBe("vite build");
      expect(pkg.scripts.preview).toBe("vite preview");
      expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
      expect(pkg.dependencies.phaser).toBe("^4.2.1");
    });

    it("mounts #app and loads src/main.ts from index.html", () => {
      const html = readFileSync(
        join(templateDir(info.id), "index.html"),
        "utf8",
      );
      expect(html).toContain("{{projectName}}");
      expect(html).toContain('<div id="app"></div>');
      expect(html).toContain("/src/main.ts");
    });

    it("imports Phaser with the Phaser 4 wildcard syntax everywhere", () => {
      for (const file of listFiles(templateDir(info.id))) {
        if (extname(file) !== ".ts") {
          continue;
        }
        const source = readFileSync(file, "utf8");
        if (
          !source.includes('from "phaser"') &&
          !source.includes("from 'phaser'")
        ) {
          continue;
        }
        expect(source.replace(/\\/g, "/"), file).toMatch(
          /import\s+\*\s+as\s+Phaser\s+from\s+["']phaser["']/,
        );
        expect(source.replace(/\\/g, "/"), file).not.toMatch(
          /import\s+Phaser\s+from\s+["']phaser["']/,
        );
      }
    });

    it("ships no binary assets (all visuals are procedural)", () => {
      const dir = templateDir(info.id);
      for (const file of listFiles(dir)) {
        const rel = relative(dir, file);
        if (rel.endsWith("gitignore") || rel === "") {
          continue;
        }
        const allowed = ALLOWED_TEXT_EXTENSIONS.has(
          extname(file).toLowerCase(),
        );
        expect(
          allowed,
          `${rel} must be a text file - templates must not ship binary assets`,
        ).toBe(true);
      }
    });
  });
}
