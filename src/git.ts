import { spawnSync } from "node:child_process";

const SHELL = process.platform === "win32";

export function isGitAvailable(): boolean {
  try {
    return (
      spawnSync("git", ["--version"], { shell: SHELL, stdio: "ignore" })
        .status === 0
    );
  } catch {
    return false;
  }
}

/**
 * Best-effort `git init` (+ optional initial commit) in destDir.
 * Never throws: a failed git step must not fail the scaffold.
 */
export function initGit(destDir: string, withCommit: boolean): boolean {
  if (!isGitAvailable()) {
    return false;
  }
  try {
    const init = spawnSync("git", ["init"], {
      cwd: destDir,
      stdio: "ignore",
      shell: SHELL,
    });
    if (init.status !== 0) {
      return false;
    }
    if (!withCommit) {
      return true;
    }
    spawnSync("git", ["add", "-A"], {
      cwd: destDir,
      stdio: "ignore",
      shell: SHELL,
    });
    const commit = spawnSync(
      "git",
      ["commit", "-m", "chore: initial commit by @involvex/create-phaser"],
      {
        cwd: destDir,
        stdio: "ignore",
        shell: SHELL,
      },
    );
    return commit.status === 0;
  } catch {
    return false;
  }
}
