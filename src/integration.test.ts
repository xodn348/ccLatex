import { describe, expect, test } from "bun:test";
import { runSetup } from "./setup.js";

/**
 * Integration tests: exercise the full end-to-end pipeline
 * runSetup → detectInstalledClis → buildMultiPtyHookBlock → upsertHookBlock
 *
 * File I/O is injected via fsFns; detectFn is injected to avoid real PATH probing.
 * All assertions are on the final rc file content written by the pipeline.
 */
describe("integration: full setup pipeline", () => {
  const noopFsFns = {
    existsSync: (_p: string) => false,
    readFileSync: (_p: string) => "",
    writeFileSync: (_p: string, _c: string) => {},
  };

  test("single CLI (claude): written rc content uses cclatex-wrap not pipe", () => {
    let writtenContent = "";

    runSetup({
      rc: "/tmp/int-test.zshrc",
      detectFn: () => [{ name: "Claude", binName: "claude", functionName: "claude" }],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (_p: string, c: string) => { writtenContent = c; },
      },
    });

    expect(writtenContent).toContain("cclatex-wrap claude");
    expect(writtenContent).not.toContain("| cclatex");
  });

  test("two CLIs (claude + opencode/oc): both shell functions appear in written rc content", () => {
    let writtenContent = "";

    runSetup({
      rc: "/tmp/int-test.zshrc",
      detectFn: () => [
        { name: "Claude",    binName: "claude",   functionName: "claude"   },
        { name: "OpenCode",  binName: "opencode",  functionName: "oc"       },
      ],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (_p: string, c: string) => { writtenContent = c; },
      },
    });

    expect(writtenContent).toContain("claude() {");
    expect(writtenContent).toContain("oc() {");
  });

  test("CCLATEX_NO_WRAP bypass guard is present in written rc content", () => {
    let writtenContent = "";

    runSetup({
      rc: "/tmp/int-test.zshrc",
      detectFn: () => [{ name: "Aider", binName: "aider", functionName: "aider" }],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (_p: string, c: string) => { writtenContent = c; },
      },
    });

    expect(writtenContent).toContain("CCLATEX_NO_WRAP");
  });

  test("__CCLATEX_ACTIVE recursive guard is present in written rc content", () => {
    let writtenContent = "";

    runSetup({
      rc: "/tmp/int-test.zshrc",
      detectFn: () => [{ name: "Goose", binName: "goose", functionName: "goose" }],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (_p: string, c: string) => { writtenContent = c; },
      },
    });

    expect(writtenContent).toContain("__CCLATEX_ACTIVE");
  });

  test("pipeline is idempotent: running setup twice produces same rc content", () => {
    let rcContent = "export PATH=\"/usr/local/bin:$PATH\"\n";

    const fsFns = {
      existsSync: (_p: string) => true,
      readFileSync: (_p: string) => rcContent,
      writeFileSync: (_p: string, c: string) => { rcContent = c; },
    };

    const detectFn = () => [{ name: "Claude", binName: "claude", functionName: "claude" }];

    runSetup({ rc: "/tmp/int-test.zshrc", detectFn, fsFns });
    const afterFirst = rcContent;

    runSetup({ rc: "/tmp/int-test.zshrc", detectFn, fsFns });
    const afterSecond = rcContent;

    expect(afterFirst).toBe(afterSecond);
  });

  test("hook block is wrapped in cclatex auto hook markers", () => {
    let writtenContent = "";

    runSetup({
      rc: "/tmp/int-test.zshrc",
      detectFn: () => [{ name: "Codex", binName: "codex", functionName: "codex" }],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (_p: string, c: string) => { writtenContent = c; },
      },
    });

    expect(writtenContent).toContain("# >>> cclatex auto hook >>>");
    expect(writtenContent).toContain("# <<< cclatex auto hook <<<");
  });

  test("command -v cclatex-wrap PATH check is present in written rc content", () => {
    let writtenContent = "";

    runSetup({
      rc: "/tmp/int-test.zshrc",
      detectFn: () => [{ name: "Claude", binName: "claude", functionName: "claude" }],
      fsFns: {
        ...noopFsFns,
        writeFileSync: (_p: string, c: string) => { writtenContent = c; },
      },
    });

    expect(writtenContent).toContain("command -v cclatex-wrap");
  });
});
