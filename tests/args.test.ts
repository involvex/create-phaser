import { describe, expect, it } from "bun:test";
import { ArgError, HELP, parse } from "../src/args";

describe("args.parse", () => {
  it("returns defaults with no arguments", () => {
    expect(parse([])).toEqual({
      yes: false,
      list: false,
      help: false,
      version: false,
    });
  });

  it("parses a bare positional project name", () => {
    const args = parse(["my-game"]);
    expect(args.projectName).toBe("my-game");
  });

  it("parses --template and -t", () => {
    expect(parse(["--template", "card-game"]).template).toBe("card-game");
    expect(parse(["-t", "card-game"]).template).toBe("card-game");
  });

  it("parses --pm", () => {
    expect(parse(["--pm", "bun"]).pm).toBe("bun");
  });

  it("--install and --no-install override each other safely", () => {
    expect(parse(["--install"]).install).toBe(true);
    expect(parse(["--no-install"]).noInstall).toBe(true);
    expect(parse(["--install", "--no-install"]).noInstall).toBe(true);
    expect(parse(["--no-install", "--install"]).install).toBe(true);
  });

  it("--git and --no-git override each other safely", () => {
    expect(parse(["--git"]).git).toBe(true);
    expect(parse(["--no-git"]).noGit).toBe(true);
  });

  it("parses short and long convenience flags", () => {
    expect(parse(["-y"]).yes).toBe(true);
    expect(parse(["--yes"]).yes).toBe(true);
    expect(parse(["-l"]).list).toBe(true);
    expect(parse(["--list"]).list).toBe(true);
    expect(parse(["-h"]).help).toBe(true);
    expect(parse(["--help"]).help).toBe(true);
    expect(parse(["-V"]).version).toBe(true);
    expect(parse(["--version"]).version).toBe(true);
  });

  it("supports -t/--template with an attached position", () => {
    const args = parse(["my-game", "-t", "blank"]);
    expect(args.projectName).toBe("my-game");
    expect(args.template).toBe("blank");
  });

  it("throws on unknown options", () => {
    expect(() => parse(["--nope"])).toThrow(ArgError);
    expect(() => parse(["-z"])).toThrow(ArgError);
  });

  it("throws when a value flag is missing its value", () => {
    expect(() => parse(["--template"])).toThrow(ArgError);
    expect(() => parse(["--pm"])).toThrow(ArgError);
    expect(() => parse(["-t"])).toThrow(ArgError);
  });

  it("throws on multiple project names", () => {
    expect(() => parse(["one", "two"])).toThrow(ArgError);
  });

  it("treats remaining args after -- as positionals", () => {
    const args = parse(["--", "my-game"]);
    expect(args.projectName).toBe("my-game");
    expect(args.template).toBeUndefined();
  });

  it("renders a help text mentioning every option", () => {
    for (const needle of [
      "--template",
      "--pm",
      "--no-install",
      "--no-git",
      "--list",
      "--version",
      "--help",
    ]) {
      expect(HELP).toContain(needle);
    }
  });
});
