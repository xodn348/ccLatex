import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const runCli = (input: string): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync("node", ["dist/cli.js"], {
    input,
    encoding: "utf8"
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
};

describe("cclatex e2e", () => {
  beforeAll(() => {
    const build = spawnSync("bun", ["run", "build"], { encoding: "utf8" });
    expect(build.status).toBe(0);
  });

  test("passes plain text", () => {
    const result = runCli("Hello world, no math here\n");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("Hello world, no math here\n");
  });

  test("transforms inline latex", () => {
    const result = runCli("The formula $E=mc^2$ is famous\n");
    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan("The formula  is famous\n".length);
    expect(result.stdout).toContain("The formula");
    expect(result.stdout).toContain("is famous");
    expect(result.stdout).not.toContain("$E=mc^2$");
  });

  test("handles display latex", () => {
    const result = runCli("$$\\int_0^1 x dx$$\n");
    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout).not.toContain("$$\\int_0^1 x dx$$");
  });
});
