import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const wrapPath = join(process.cwd(), "dist", "wrap.js");
const hasBuiltWrap = existsSync(wrapPath);
const canRunPtyE2e = hasBuiltWrap && process.stdout.isTTY;

const runWrap = (args: string[]) => {
  return spawnSync(process.execPath, [wrapPath, ...args], {
    encoding: "utf8"
  });
};

describe("cclatex-wrap e2e", () => {
  test.if(canRunPtyE2e)("forwards plain output", () => {
    const result = runWrap([process.execPath, "-e", "process.stdout.write('hello')"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("hello");
  });

  test.if(canRunPtyE2e)("propagates child exit code", () => {
    const result = runWrap([process.execPath, "-e", "process.exit(3)"]);
    expect(result.status).toBe(3);
  });

  test.if(canRunPtyE2e)("returns 127 when command is missing", () => {
    const result = runWrap(["definitely-not-a-real-command-12345"]);
    expect(result.status).toBe(127);
    expect(result.stderr).toContain("Command not found");
  });
});
