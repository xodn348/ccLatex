import { describe, expect, test } from "bun:test";
import { LatexTransformStream } from "./transform.js";
import type { RenderOptions } from "./types.js";

const runTransform = async (input: string): Promise<string> => {
  const stream = new LatexTransformStream({
    renderFormula: async (tex: string, _options: RenderOptions) => ({
      png: Buffer.from(tex)
    }),
    renderTerminal: async (png: Buffer) => `[IMG:${png.toString("utf8")}]`
  });

  return await new Promise<string>((resolve, reject) => {
    let output = "";
    stream.on("data", (chunk: Buffer | string) => {
      output += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
    });
    stream.on("end", () => resolve(output));
    stream.on("error", (error) => reject(error));

    stream.write(input);
    stream.end();
  });
};

const runTransformChunks = async (chunks: string[]): Promise<string> => {
  const stream = new LatexTransformStream({
    renderFormula: async (tex: string, _options: RenderOptions) => ({
      png: Buffer.from(tex)
    }),
    renderTerminal: async (png: Buffer) => `[IMG:${png.toString("utf8")}]`
  });

  return await new Promise<string>((resolve, reject) => {
    let output = "";
    stream.on("data", (chunk: Buffer | string) => {
      output += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
    });
    stream.on("end", () => resolve(output));
    stream.on("error", (error) => reject(error));

    for (const chunk of chunks) {
      stream.write(chunk);
    }
    stream.end();
  });
};

describe("LatexTransformStream", () => {
  test("passes plain text unchanged", async () => {
    const output = await runTransform("hello world");
    expect(output).toBe("hello world");
  });

  test("replaces inline formula", async () => {
    const output = await runTransform("The $E=mc^2$ formula");
    expect(output).toBe("The [IMG:E=mc^2] formula");
  });

  test("replaces display formula", async () => {
    const output = await runTransform("$$\\int_0^1 x dx$$");
    expect(output).toBe("[IMG:\\int_0^1 x dx]");
  });

  test("preserves mixed text", async () => {
    const output = await runTransform("A $x$ and B $y$");
    expect(output).toBe("A [IMG:x] and B [IMG:y]");
  });

  test("handles multiline display expression", async () => {
    const output = await runTransform("Start $$\\n\\int_0^1 x dx\\n$$ End");
    expect(output).toContain("Start [IMG:\\n\\int_0^1 x dx\\n] End");
  });

  test("handles chunked formula boundaries", async () => {
    const output = await runTransformChunks(["The $E=", "mc^2$ is here"]);
    expect(output).toBe("The [IMG:E=mc^2] is here");
  });
});
