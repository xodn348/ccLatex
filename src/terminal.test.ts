import { describe, expect, test } from "bun:test";
import { renderLatex } from "./renderer.js";
import { renderToTerminal } from "./terminal.js";

describe("renderToTerminal", () => {
  test("converts PNG buffer into output string", async () => {
    const rendered = await renderLatex("x^2", { displayMode: false });
    const output = await renderToTerminal(rendered.png);

    expect(output.length).toBeGreaterThan(0);
  });

  test("throws on empty buffer", async () => {
    await expect(renderToTerminal(Buffer.alloc(0))).rejects.toThrow();
  });
});
