import { describe, expect, test } from "bun:test";
import { renderLatex } from "./renderer.js";

describe("renderLatex", () => {
  test("renders inline latex to PNG", async () => {
    const result = await renderLatex("E=mc^2", { displayMode: false });

    expect(result.png.length).toBeGreaterThan(100);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });

  test("renders display latex", async () => {
    const result = await renderLatex("\\int_0^1 x dx", { displayMode: true });
    expect(result.png.length).toBeGreaterThan(100);
  });

  test("handles invalid latex input without crashing", async () => {
    const result = await renderLatex("\\invalid{", { displayMode: false });
    expect(result.png.length).toBeGreaterThan(0);
  });
});
