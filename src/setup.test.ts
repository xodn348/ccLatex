import { describe, expect, test } from "bun:test";
import { AI_CLI_REGISTRY } from "./hook-utils.js";
import { detectInstalledClis } from "./setup.js";

describe("detectInstalledClis", () => {
  test("returns empty array when no CLIs found", () => {
    const mockExec = () => { throw new Error("not found"); };
    const result = detectInstalledClis(AI_CLI_REGISTRY, mockExec);
    expect(result).toEqual([]);
  });

  test("returns only entries for installed CLIs", () => {
    const registry = [
      { name: "Claude", binName: "claude", functionName: "claude" },
      { name: "Codex", binName: "codex", functionName: "codex" },
    ];

    const mockExec = (cmd: string) => {
      if (cmd.includes("claude")) return;
      throw new Error("not found");
    };

    const result = detectInstalledClis(registry, mockExec);
    expect(result).toHaveLength(1);
    expect(result[0].functionName).toBe("claude");
  });

  test("includes ALL entries for multi-alias binaries (opencode has oc + opencode)", () => {
    const registry = [
      { name: "OpenCode", binName: "opencode", functionName: "oc" },
      { name: "OpenCode", binName: "opencode", functionName: "opencode" },
    ];

    const result = detectInstalledClis(registry, () => undefined);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.functionName)).toContain("oc");
    expect(result.map((e) => e.functionName)).toContain("opencode");
  });

  test("deduplicates binary checks (opencode checked only once)", () => {
    const registry = [
      { name: "OpenCode", binName: "opencode", functionName: "oc" },
      { name: "OpenCode", binName: "opencode", functionName: "opencode" },
    ];

    let callCount = 0;
    const mockExec = () => { callCount++; };

    detectInstalledClis(registry, mockExec);
    expect(callCount).toBe(1);
  });

  test("uses command -v for detection (POSIX portable)", () => {
    const registry = [{ name: "Claude", binName: "claude", functionName: "claude" }];
    let capturedCmd = "";
    const mockExec = (cmd: string) => { capturedCmd = cmd; };

    detectInstalledClis(registry, mockExec);
    expect(capturedCmd).toContain("command -v");
    expect(capturedCmd).toContain("claude");
  });
});
