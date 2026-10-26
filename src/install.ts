import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE_MANAGERS } from "./types";
import type { PackageManager } from "./types";

/** `true` when running on Windows so child processes resolve .cmd shims. */
const SHELL = process.platform === "win32";

const LOCKFILES: Array<[lockfile: string, pm: PackageManager]> = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
  ["yarn.lock", "yarn"],
  ["pnpm-lock.yaml", "pnpm"],
];

const PM_INSTALL_ARGS: Record<PackageManager, string[]> = {
  bun: ["install"],
  npm: ["install"],
  pnpm: ["install"],
  yarn: ["install"],
};

export function isPackageManager(value: string): value is PackageManager {
  return (PACKAGE_MANAGERS as readonly string[]).includes(value);
}

function isOnPath(pm: PackageManager): boolean {
  try {
    return (
      spawnSync(pm, ["--version"], { shell: SHELL, stdio: "ignore" }).status ===
      0
    );
  } catch {
    return false;
  }
}

/**
 * Select the package manager to default to:
 * 1. a lockfile in the target directory, then in the current directory
 * 2. the first PM available on PATH (bun preferred), falling back to npm
 */
export function detectPackageManager(
  targetDir: string,
  cwd: string = process.cwd(),
): PackageManager {
  for (const dir of [targetDir, cwd]) {
    for (const [lockfile, pm] of LOCKFILES) {
      if (existsSync(join(dir, lockfile))) {
        return pm;
      }
    }
  }
  for (const pm of PACKAGE_MANAGERS) {
    if (isOnPath(pm)) {
      return pm;
    }
  }
  return "npm";
}

/** Run `<pm> install` in destDir, streaming output so the user sees progress. Returns success. */
export function runInstall(pm: PackageManager, destDir: string): boolean {
  const result = spawnSync(pm, PM_INSTALL_ARGS[pm], {
    cwd: destDir,
    stdio: "inherit",
    shell: SHELL,
  });
  return result.status === 0;
}
