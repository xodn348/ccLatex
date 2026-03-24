import { describe, expect, test } from "bun:test";
import { AI_CLI_REGISTRY } from "./hook-utils.js";
import { detectInstalledClis, runSetup } from "./setup.js";

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

describe("runSetup", () => {
  const claudeEntry = { name: "Claude", binName: "claude", functionName: "claude" };
  const noopFsFns = {
    existsSync: (_p: string) => false,
    readFileSync: (_p: string) => "",
    writeFileSync: (_p: string, _c: string) => {},
  };

  test("writes hook block to rc file when CLIs are found", () => {
    let writtenPath = "";
    let writtenContent = "";

    runSetup({
      rc: "/tmp/test.zshrc",
      detectFn: () => [claudeEntry],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (p: string, c: string) => { writtenPath = p; writtenContent = c; },
      },
    });

    expect(writtenPath).toBe("/tmp/test.zshrc");
    expect(writtenContent).toContain("cclatex auto hook");
  });

  test("prints installed CLI names to stdout", () => {
    const output: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => output.push(msg);

    runSetup({
      rc: "/tmp/test.zshrc",
      detectFn: () => [claudeEntry],
      fsFns: { ...noopFsFns, writeFileSync: () => {} },
    });

    console.log = origLog;
    expect(output.join("\n")).toContain("claude");
  });

  test("does not write rc file when no CLIs found", () => {
    let writeCallCount = 0;
    const output: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => output.push(msg);

    runSetup({
      rc: "/tmp/test.zshrc",
      detectFn: () => [],
      fsFns: {
        ...noopFsFns,
        writeFileSync: () => { writeCallCount++; },
      },
    });

    console.log = origLog;
    expect(writeCallCount).toBe(0);
    expect(output.join("\n")).toContain("No AI CLI tools found");
  });

  test("uses rc option path instead of default rc path", () => {
    let writtenPath = "";

    runSetup({
      rc: "/custom/path/.myrc",
      detectFn: () => [claudeEntry],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (p: string) => { writtenPath = p; },
      },
    });

    expect(writtenPath).toBe("/custom/path/.myrc");
  });

  test("uses ~/.zshrc when SHELL env var is /bin/zsh", () => {
    const origShell = process.env.SHELL;
    process.env.SHELL = "/bin/zsh";
    let writtenPath = "";

    runSetup({
      detectFn: () => [claudeEntry],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (p: string) => { writtenPath = p; },
      },
    });

    process.env.SHELL = origShell;
    expect(writtenPath).toContain(".zshrc");
  });

  test("uses ~/.bashrc when SHELL env var is /bin/bash", () => {
    const origShell = process.env.SHELL;
    process.env.SHELL = "/bin/bash";
    let writtenPath = "";

    runSetup({
      detectFn: () => [claudeEntry],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (p: string) => { writtenPath = p; },
      },
    });

    process.env.SHELL = origShell;
    expect(writtenPath).toContain(".bashrc");
  });
});
