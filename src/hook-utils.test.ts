import { describe, expect, test } from "bun:test";
import { AI_CLI_REGISTRY, buildHookBlock, removeHookBlock, upsertHookBlock } from "./hook-utils.js";

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
  test("has at least 8 entries", () => {
    expect(AI_CLI_REGISTRY.length).toBeGreaterThanOrEqual(8);
  });

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
