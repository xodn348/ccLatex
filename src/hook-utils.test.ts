import { describe, expect, test } from "bun:test";
import { buildHookBlock, removeHookBlock, upsertHookBlock } from "./hook-utils.js";

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
