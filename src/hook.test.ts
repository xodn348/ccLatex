import { describe, expect, test } from "bun:test";
import { runHookCli } from "./hook.js";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("runHookCli", () => {
  test("install writes PTY hook block to rc file", () => {
    const dir = mkdtempSync(join(tmpdir(), "cclatex-hook-test-"));
    const rcPath = join(dir, ".zshrc");
    try {
      runHookCli(["install", "--command", "opencode", "--upstream", "opencode", "--rc", rcPath]);
      const content = readFileSync(rcPath, "utf8");
      expect(content).toContain("cclatex-wrap");
      expect(content).not.toContain("| cclatex");
      expect(content).toContain("CCLATEX_NO_WRAP");
      expect(content).toContain("__CCLATEX_ACTIVE");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("install creates rc file if it does not exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "cclatex-hook-test-"));
    const rcPath = join(dir, ".zshrc");
    try {
      expect(existsSync(rcPath)).toBe(false);
      runHookCli(["install", "--command", "claude", "--upstream", "claude", "--rc", rcPath]);
      expect(existsSync(rcPath)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("status reports not installed when rc file does not exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "cclatex-hook-test-"));
    const rcPath = join(dir, ".zshrc");
    try {
      // Capture stdout
      const chunks: string[] = [];
      const orig = process.stdout.write.bind(process.stdout);
      process.stdout.write = (chunk: string | Uint8Array) => {
        chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
        return true;
      };
      runHookCli(["status", "--rc", rcPath]);
      process.stdout.write = orig;
      expect(chunks.join("")).toContain("not installed");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("remove removes hook block from rc file", () => {
    const dir = mkdtempSync(join(tmpdir(), "cclatex-hook-test-"));
    const rcPath = join(dir, ".zshrc");
    try {
      runHookCli(["install", "--command", "opencode", "--upstream", "opencode", "--rc", rcPath]);
      runHookCli(["remove", "--rc", rcPath]);
      const content = readFileSync(rcPath, "utf8");
      expect(content).not.toContain("# >>> cclatex auto hook >>>");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
