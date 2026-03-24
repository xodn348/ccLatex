import { describe, expect, test } from "bun:test";
import { detectLatex } from "./detector.js";

describe("detectLatex", () => {
  test("detects single inline formula", () => {
    const matches = detectLatex("The $E=mc^2$ formula");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.tex).toBe("E=mc^2");
    expect(matches[0]?.displayMode).toBe(false);
  });

  test("detects display formula", () => {
    const matches = detectLatex("$$\\int_0^1 x dx$$");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.displayMode).toBe(true);
  });

  test("detects multiple formulas", () => {
    const matches = detectLatex("$a$ and $b$");
    expect(matches).toHaveLength(2);
  });

  test("returns empty for plain text", () => {
    expect(detectLatex("Hello world")).toHaveLength(0);
  });

  test("ignores currency", () => {
    expect(detectLatex("$5 and $10")).toHaveLength(0);
  });

  test("does not skip valid formula after invalid currency candidate", () => {
    const matches = detectLatex("Price $5 and $x$");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.tex).toBe("x");
  });

  test("ignores escaped dollars", () => {
    expect(detectLatex("Cost is \\$5")).toHaveLength(0);
  });
});
