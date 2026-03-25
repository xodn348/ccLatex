import { describe, expect, test } from "bun:test";
import { AI_CLI_REGISTRY, buildHookBlock, buildMultiPtyHookBlock, buildPtyHookBlock, HOOK_MARKER_END, HOOK_MARKER_START, removeHookBlock, upsertHookBlock } from "./hook-utils.js";

describe("hook utils", () => {
  test("builds hook block for command", () => {
    const block = buildHookBlock({ functionName: "oc", upstreamCommand: "opencode" });
    expect(block).toContain("oc() {");
    expect(block).toContain("opencode \"$@\"");
    expect(block).toContain("unalias oc");
  });

  test("upsert is idempotent", () => {
    const block = buildHookBlock({ functionName: "opencode", upstreamCommand: "opencode" });
    const once = upsertHookBlock("export PATH=\"/tmp:$PATH\"\n", block);
    const twice = upsertHookBlock(once, block);
    expect(once).toBe(twice);
  });

  test("removes hook block", () => {
    const block = buildHookBlock({ functionName: "opencode", upstreamCommand: "opencode" });
    const withHook = upsertHookBlock("", block);
    const removed = removeHookBlock(withHook);
    expect(removed).not.toContain("cclatex auto hook");
  });
});

describe("AI CLI registry", () => {
  test("every entry has non-empty name, binName, functionName", () => {
    for (const entry of AI_CLI_REGISTRY) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.binName.length).toBeGreaterThan(0);
      expect(entry.functionName.length).toBeGreaterThan(0);
    }
  });

  test("registry contains entry with functionName 'oc'", () => {
    expect(AI_CLI_REGISTRY.some((e) => e.functionName === "oc")).toBe(true);
  });

  test("registry contains entry with functionName 'claude'", () => {
    expect(AI_CLI_REGISTRY.some((e) => e.functionName === "claude")).toBe(true);
  });

  test("registry contains entry with functionName 'aider'", () => {
    expect(AI_CLI_REGISTRY.some((e) => e.functionName === "aider")).toBe(true);
  });
});

describe("PTY wrapper mode", () => {
  test("buildPtyHookBlock uses cclatex-wrap not pipe", () => {
    const block = buildPtyHookBlock({ functionName: "oc", upstreamCommand: "opencode" });
    expect(block).toContain("cclatex-wrap opencode");
    expect(block).not.toContain("| cclatex");
  });

  test("buildPtyHookBlock contains CCLATEX_NO_WRAP bypass", () => {
    const block = buildPtyHookBlock({ functionName: "claude", upstreamCommand: "claude" });
    expect(block).toContain("CCLATEX_NO_WRAP");
  });

  test("buildPtyHookBlock contains __CCLATEX_ACTIVE recursive guard", () => {
    const block = buildPtyHookBlock({ functionName: "oc", upstreamCommand: "opencode" });
    expect(block).toContain("__CCLATEX_ACTIVE");
  });

  test("buildPtyHookBlock contains command -v cclatex-wrap PATH check", () => {
    const block = buildPtyHookBlock({ functionName: "oc", upstreamCommand: "opencode" });
    expect(block).toContain("command -v cclatex-wrap");
  });

  test("buildPtyHookBlock falls back to direct command when cclatex-wrap not found", () => {
    const block = buildPtyHookBlock({ functionName: "oc", upstreamCommand: "opencode" });
    expect(block).not.toContain("npx");
    expect(block).toContain('command opencode "$@"');
  });

  test("buildPtyHookBlock throws on invalid function name", () => {
    expect(() =>
      buildPtyHookBlock({ functionName: "invalid name", upstreamCommand: "opencode" })
    ).toThrow("Invalid function name");
  });

  test("buildPtyHookBlock wraps in marker block", () => {
    const block = buildPtyHookBlock({ functionName: "aider", upstreamCommand: "aider" });
    expect(block).toContain("# >>> cclatex auto hook >>>");
    expect(block).toContain("# <<< cclatex auto hook <<<");
  });
});

describe("buildMultiPtyHookBlock", () => {
  test("generates functions for each target in one marker block", () => {
    const block = buildMultiPtyHookBlock([
      { functionName: "claude", upstreamCommand: "claude" },
      { functionName: "oc", upstreamCommand: "opencode" },
    ]);
    expect(block).toContain("claude() {");
    expect(block).toContain("oc() {");
    // Only ONE marker pair
    const startCount = (block.match(/# >>> cclatex auto hook >>>/g) || []).length;
    expect(startCount).toBe(1);
  });

  test("each target gets CCLATEX_NO_WRAP + __CCLATEX_ACTIVE guards", () => {
    const block = buildMultiPtyHookBlock([
      { functionName: "aider", upstreamCommand: "aider" },
    ]);
    expect(block).toContain("CCLATEX_NO_WRAP");
    expect(block).toContain("__CCLATEX_ACTIVE");
  });

  test("each target uses cclatex-wrap not pipe", () => {
    const block = buildMultiPtyHookBlock([
      { functionName: "goose", upstreamCommand: "goose" },
    ]);
    expect(block).toContain("cclatex-wrap goose");
    expect(block).not.toContain("| cclatex");
  });

  test("each target falls back to direct command when cclatex-wrap is unavailable", () => {
    const block = buildMultiPtyHookBlock([
      { functionName: "oc", upstreamCommand: "opencode" },
    ]);
    expect(block).not.toContain("npx");
    expect(block).toContain('command opencode "$@"');
  });

  test("throws on invalid function name", () => {
    expect(() =>
      buildMultiPtyHookBlock([{ functionName: "bad name", upstreamCommand: "goose" }])
    ).toThrow("Invalid function name");
  });

  test("empty targets produces # No AI CLI hooks configured comment", () => {
    const block = buildMultiPtyHookBlock([]);
    expect(block).toContain(HOOK_MARKER_START);
    expect(block).toContain(HOOK_MARKER_END);
    expect(block).toContain("# No AI CLI hooks configured");
  });
});
