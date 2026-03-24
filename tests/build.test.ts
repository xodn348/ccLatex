import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

describe("build artifact", () => {
  test("build creates dist/cli.js with shebang", () => {
    const build = spawnSync("bun", ["run", "build"], { encoding: "utf8" });
    expect(build.status).toBe(0);

    expect(existsSync("dist/cli.js")).toBe(true);
    const firstLine = readFileSync("dist/cli.js", "utf8").split("\n")[0];
    expect(firstLine).toBe("#!/usr/bin/env node");
  });

  test("npm pack dry-run includes dist", () => {
    const pack = spawnSync("npm", ["pack", "--dry-run"], { encoding: "utf8" });
    const combined = `${pack.stdout}\n${pack.stderr}`;
    expect(pack.status).toBe(0);
    expect(combined).toContain("dist/cli.js");
  });
});
