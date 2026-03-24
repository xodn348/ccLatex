import { describe, expect, test } from "bun:test";
import { LatexTransformStream } from "./transform.js";
import type { RenderOptions } from "./types.js";

const transformWithError = async (input: string): Promise<string> => {
  const stream = new LatexTransformStream({
    renderFormula: async (_tex: string, _options: RenderOptions) => {
      throw new Error("forced render failure");
    },
    renderTerminal: async (_png: Buffer) => "unused"
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

describe("error handling", () => {
  test("falls back to original latex text when render fails", async () => {
    const input = "Broken $\\invalid{$ formula";
    const output = await transformWithError(input);
    expect(output).toBe(input);
  });

  test("falls back to original latex text when terminal rendering fails", async () => {
    const stream = new LatexTransformStream({
      renderFormula: async (tex: string, _options: RenderOptions) => ({
        png: Buffer.from(tex)
      }),
      renderTerminal: async (_png: Buffer) => {
        throw new Error("terminal unavailable");
      }
    });

    const output = await new Promise<string>((resolve, reject) => {
      let value = "";
      stream.on("data", (chunk: Buffer | string) => {
        value += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      });
      stream.on("end", () => resolve(value));
      stream.on("error", (error) => reject(error));
      stream.write("A $x$ B");
      stream.end();
    });

    expect(output).toBe("A $x$ B");
  });
});
