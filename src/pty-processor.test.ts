import { describe, expect, test } from "bun:test";
import { PtyLatexProcessor } from "./pty-processor.js";
import type { RenderOptions } from "./types.js";

const createProcessor = () =>
  new PtyLatexProcessor({
    renderFormula: async (tex: string, _options: RenderOptions) => ({
      png: Buffer.from(tex),
      width: 1,
      height: 1
    }),
    renderTerminal: async (png: Buffer) => `[IMG:${png.toString("utf8")}]`
  });

describe("PtyLatexProcessor", () => {
  test("passes plain text unchanged", async () => {
    const processor = createProcessor();
    expect(await processor.process("hello world")).toBe("hello world");
  });

  test("replaces inline formula", async () => {
    const processor = createProcessor();
    expect(await processor.process("A $x$ B")).toBe("A [IMG:x] B");
  });

  test("handles chunked formulas across process calls", async () => {
    const processor = createProcessor();
    expect(await processor.process("A $x")).toBe("A ");
    expect(await processor.process("^2$ B")).toBe("[IMG:x^2] B");
  });

  test("preserves ansi sequences around non-latex text", async () => {
    const processor = createProcessor();
    const input = "\u001b[31mred\u001b[0m and $x$";
    expect(await processor.process(input)).toBe("\u001b[31mred\u001b[0m and [IMG:x]");
  });

  test("falls back to raw latex when rendering fails", async () => {
    const processor = new PtyLatexProcessor({
      renderFormula: async (_tex: string, _options: RenderOptions) => {
        throw new Error("forced");
      },
      renderTerminal: async (_png: Buffer) => "unused"
    });

    expect(await processor.process("A $x$ B")).toBe("A $x$ B");
  });

  test("flush emits unfinished latex tail", async () => {
    const processor = createProcessor();
    expect(await processor.process("start $x")).toBe("start ");
    expect(await processor.flush()).toBe("$x");
  });
});
