import { describe, expect, test } from "bun:test";
import type { CliFlags, LatexMatch, RenderOptions, RenderResult, TerminalCapabilities, TerminalProtocol, TransformOptions } from "./types.js";

describe("types", () => {
  test("allows expected shapes", () => {
    const match: LatexMatch = {
      raw: "$x$",
      tex: "x",
      displayMode: false,
      startIndex: 0,
      endIndex: 3
    };

    const renderOptions: RenderOptions = { displayMode: true, fontSize: 24 };
    const renderResult: RenderResult = { png: Buffer.from([]), width: 1, height: 1 };
    const protocol: TerminalProtocol = "ansi";
    const terminalCapabilities: TerminalCapabilities = { protocol, supportsImages: true };
    const transformOptions: TransformOptions = { fontSize: 18, backgroundColor: "white" };
    const cliFlags: CliFlags = { fontSize: 12, background: "white" };

    expect(match.tex).toBe("x");
    expect(renderOptions.displayMode).toBe(true);
    expect(renderResult.width).toBe(1);
    expect(terminalCapabilities.supportsImages).toBe(true);
    expect(transformOptions.fontSize).toBe(18);
    expect(cliFlags.background).toBe("white");
  });
});
