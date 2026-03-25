import { describe, expect, test } from "bun:test";
import { parseWrapArgs, runWithoutPtyFallback } from "./wrap.js";

describe("parseWrapArgs", () => {
  test("parses command and args", () => {
    const parsed = parseWrapArgs(["oc", "run"]);
    expect(parsed.command).toBe("oc");
    expect(parsed.args).toEqual(["run"]);
    expect(parsed.flags.fontSize).toBe(20);
    expect(parsed.flags.background).toBe("white");
  });

  test("parses wrapper flags", () => {
    const parsed = parseWrapArgs(["--font-size", "24", "--background", "#fff", "oc"]);
    expect(parsed.command).toBe("oc");
    expect(parsed.args).toEqual([]);
    expect(parsed.flags.fontSize).toBe(24);
    expect(parsed.flags.background).toBe("#fff");
  });

  test("supports -- separator for command flags", () => {
    const parsed = parseWrapArgs(["--font-size", "22", "--", "oc", "--model", "x"]);
    expect(parsed.command).toBe("oc");
    expect(parsed.args).toEqual(["--model", "x"]);
    expect(parsed.flags.fontSize).toBe(22);
  });

  test("throws when command is missing", () => {
    expect(() => parseWrapArgs([])).toThrow();
    expect(() => parseWrapArgs(["--"])).toThrow();
  });

  test("rejects unknown wrapper options", () => {
    expect(() => parseWrapArgs(["--unknown", "oc"])).toThrow();
  });
});

describe("runWithoutPtyFallback", () => {
  test("returns 127 for a missing command", () => {
    const exitCode = runWithoutPtyFallback({
      command: "definitely-not-a-real-command-12345",
      args: [],
      fontSize: 20,
      backgroundColor: "white",
      columns: 80,
      rows: 24,
      env: process.env,
    });

    expect(exitCode).toBe(127);
  });

  test("returns wrapped command exit code", () => {
    const exitCode = runWithoutPtyFallback({
      command: process.execPath,
      args: ["-e", "process.exit(5)"],
      fontSize: 20,
      backgroundColor: "white",
      columns: 80,
      rows: 24,
      env: process.env,
    });

    expect(exitCode).toBe(5);
  });
});
