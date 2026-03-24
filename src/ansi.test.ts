import { describe, expect, test } from "bun:test";
import { stripAnsi } from "./ansi.js";

describe("stripAnsi", () => {
  test("strips SGR color codes", () => {
    expect(stripAnsi("\u001b[31mred\u001b[0m")).toBe("red");
  });

  test("strips cursor control sequences", () => {
    expect(stripAnsi("\u001b[2Jhello")).toBe("hello");
  });

  test("preserves plain text", () => {
    expect(stripAnsi("hello world")).toBe("hello world");
  });

  test("preserves latex delimiters", () => {
    expect(stripAnsi("\u001b[1m$E=mc^2$\u001b[0m")).toBe("$E=mc^2$");
  });
});
