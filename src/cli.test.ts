import { describe, expect, test } from "bun:test";
import { createCli, validateCliFlags } from "./cli.js";

describe("createCli", () => {
  test("parses font-size", () => {
    const cli = createCli(["--font-size", "24"]);
    expect(cli.flags.fontSize).toBe(24);
  });

  test("uses defaults", () => {
    const cli = createCli([]);
    expect(cli.flags.fontSize).toBe(20);
    expect(cli.flags.background).toBe("white");
  });

  test("validates accepted flag values", () => {
    const validated = validateCliFlags({ fontSize: 24, background: "#fff" });
    expect(validated.fontSize).toBe(24);
  });

  test("rejects invalid font-size", () => {
    expect(() => validateCliFlags({ fontSize: 0, background: "white" })).toThrow();
  });

  test("rejects invalid background characters", () => {
    expect(() => validateCliFlags({ fontSize: 20, background: "white;rm -rf /" })).toThrow();
  });
});
