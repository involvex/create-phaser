import { readFileSync } from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { ArgError, HELP, parse } from "./args";
import { banner } from "./theme";
import { formatTemplateList } from "./registry";
import { resolveTemplatesDir } from "./paths";
import { isDirNonEmpty, removeTargetDir, scaffoldTemplate } from "./scaffold";
import { runInstall } from "./install";
import { initGit } from "./git";
import { Cancelled, fail, resolvePlan } from "./prompts";

interface PackageMeta {
  version: string;
}

function readVersion(): string {
  try {
    const meta = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as PackageMeta;
    return meta.version;
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  let raw;
  try {
    raw = parse(argv);
  } catch (error) {
    console.error(
      pc.red(error instanceof ArgError ? error.message : String(error)),
    );
    process.exit(1);
    return;
  }

  if (raw.help) {
    console.log(HELP);
    return;
  }
  if (raw.version) {
    console.log(readVersion());
    return;
  }

  console.log(banner(readVersion()));

  if (raw.list) {
    console.log(`\nAvailable game styles:\n\n${formatTemplateList()}\n`);
    return;
  }

  const plan = await resolvePlan(process.cwd(), raw);

  if (plan.overwrite) {
    const s = p.spinner();
    s.start(`Removing existing contents of "${plan.projectName}"`);
    await removeTargetDir(path.resolve(plan.projectName));
    s.stop("Removed");
  }

  const templatesDir = resolveTemplatesDir();
  const dest = path.resolve(plan.projectName);
  if (!plan.overwrite && isDirNonEmpty(dest)) {
    fail(
      `Target directory "${dest}" is not empty. Remove it or pick another name.`,
    );
  }

  const scaffolding = p.spinner();
  scaffolding.start(`Scaffolding the "${plan.templateId}" template`);
  let fileCount = 0;
  try {
    fileCount = await scaffoldTemplate({
      templateId: plan.templateId,
      templatesDir,
      dest,
      projectName: plan.projectName,
    });
  } catch (error) {
    scaffolding.stop("Scaffolding failed");
    fail(error instanceof Error ? error.message : String(error));
  }
  scaffolding.stop(
    `Created ${fileCount} files with the ${pc.cyan(plan.templateId)} template`,
  );

  if (plan.install) {
    p.log.info(`Installing dependencies with ${pc.bold(plan.pm)}...`);
    if (!runInstall(plan.pm, dest)) {
      p.log.warn(
        `Install failed - run "${plan.pm} install" inside ./${plan.projectName} later.`,
      );
    }
  }

  if (plan.git) {
    if (initGit(dest, true)) {
      p.log.success("Initialized a git repository");
    } else {
      p.log.warn("Could not initialize git - skipping");
    }
  }

  p.outro(
    [
      pc.bold("Game on! Next steps:"),
      "",
      `  ${pc.cyan("$")}${pc.cyan(` cd ${plan.projectName}`)}`,
      `  ${pc.cyan("$")}${pc.magenta(` ${plan.pm} run dev`)}`,
    ].join("\n"),
  );
}

try {
  await main();
} catch (error) {
  if (error instanceof Cancelled) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  if (p.isCancel(error)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  fail(error instanceof Error ? error.message : String(error));
}
