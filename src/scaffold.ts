import { existsSync, readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import { extname, join } from "node:path";

/** Directories never copied from a template. */
const EXCLUDED_NAMES = new Set(["node_modules", ".keep"]);

/**
 * Files with this prefix become dotfiles in the generated project, e.g.
 * `_gitignore` -> `.gitignore` (npm strips dotfiles from published packages,
 * so templates store them with an underscore prefix).
 */
const DOTFILE_PREFIX = "_";

/** Extensions that get placeholder substitution applied while copying. */
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".html",
  ".htm",
  ".json",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
]);

function projectTitle(projectName: string): string {
  return projectName
    .split(/[-._]/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function placeholders(projectName: string): Record<string, string> {
  return {
    "{{projectName}}": projectName,
    "{{projectTitle}}": projectTitle(projectName),
  };
}

/**
 * Turn arbitrary user input into a valid npm-scope-free package / directory
 * name: lowercase kebab-case, letters/digits/dots/dashes only.
 */
export function sanitizeProjectName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+/, "")
    .replace(/[.-]+$/, "")
    .slice(0, 214);
}

/** True when the target directory exists and has at least one entry. */
export function isDirNonEmpty(dir: string): boolean {
  if (!existsSync(dir)) {
    return false;
  }
  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

/** Remove the target directory entirely (for the "overwrite" flow). */
export async function removeTargetDir(dest: string): Promise<void> {
  await fs.rm(dest, { recursive: true, force: true });
}

export interface CopyOptions {
  templateId: string;
  /** directory containing templates/<templateId>/ */
  templatesDir: string;
  /** where the project is generated */
  dest: string;
  projectName: string;
}

/** Copy a template into dest, renaming dotfiles and substituting placeholders. Returns the number of files written. */
export async function copyTemplate(options: CopyOptions): Promise<number> {
  const sourceDir = join(options.templatesDir, options.templateId);
  if (!existsSync(sourceDir)) {
    throw new Error(
      `Template "${options.templateId}" not found in ${options.templatesDir}`,
    );
  }
  await fs.mkdir(options.dest, { recursive: true });
  return copyDir(sourceDir, options.dest, options.projectName);
}

/** Copy + placeholder substitution + set name/private in package.json. */
export async function scaffoldTemplate(options: CopyOptions): Promise<number> {
  const count = await copyTemplate(options);
  await patchPackageJson(options.dest, options.projectName);
  return count;
}

async function copyDir(
  src: string,
  dest: string,
  projectName: string,
): Promise<number> {
  let count = 0;
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    if (EXCLUDED_NAMES.has(entry.name)) {
      continue;
    }
    const targetName = entry.name.startsWith(DOTFILE_PREFIX)
      ? `.${entry.name.slice(DOTFILE_PREFIX.length)}`
      : entry.name;
    const childSrc = join(src, entry.name);
    const childDest = join(dest, targetName);

    if (entry.isDirectory()) {
      await fs.mkdir(childDest, { recursive: true });
      count += await copyDir(childSrc, childDest, projectName);
    } else {
      await copyFile(childSrc, childDest, projectName);
      count += 1;
    }
  }
  return count;
}

async function copyFile(
  src: string,
  dest: string,
  projectName: string,
): Promise<void> {
  const ext = extname(dest).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) {
    await fs.copyFile(src, dest);
    return;
  }
  let text = await fs.readFile(src, "utf8");
  for (const [search, replacement] of Object.entries(
    placeholders(projectName),
  )) {
    text = text.replaceAll(search, replacement);
  }
  await fs.writeFile(dest, text, "utf8");
}

/** Rewrite the generated package.json: user's project name + private package. */
export async function patchPackageJson(
  dest: string,
  projectName: string,
): Promise<void> {
  const pkgPath = join(dest, "package.json");
  const parsed = JSON.parse(await fs.readFile(pkgPath, "utf8")) as Record<
    string,
    unknown
  >;
  parsed.name = projectName;
  parsed.private = true;
  parsed.version ??= "0.1.0";
  await fs.writeFile(pkgPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}
