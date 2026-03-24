import { Transform } from "node:stream";
import { detectLatex } from "./detector.js";
import { renderLatex } from "./renderer.js";
import { renderToTerminal } from "./terminal.js";
import type { LatexMatch, RenderOptions, TransformOptions } from "./types.js";

type InternalOptions = TransformOptions & {
  renderFormula?: (tex: string, options: RenderOptions) => Promise<{ png: Buffer }>;
  renderTerminal?: (png: Buffer) => Promise<string>;
};

export class LatexTransformStream extends Transform {
  private pending = "";

  private readonly options: InternalOptions;

  public constructor(options: InternalOptions = {}) {
    super();
    this.options = options;
  }

  public override _transform(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.pending += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
    this.processPending(false)
      .then(() => callback())
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown transform error";
        callback(new Error(message));
      });
  }

  public override _flush(callback: (error?: Error | null) => void): void {
    this.processPending(true)
      .then(() => callback())
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown transform error";
        callback(new Error(message));
      });
  }

  private async processPending(finalChunk: boolean): Promise<void> {
    const splitIndex = finalChunk ? this.pending.length : this.getProcessableLength(this.pending);
    const processable = this.pending.slice(0, splitIndex);
    this.pending = this.pending.slice(splitIndex);

    if (!processable) {
      return;
    }

    const transformed = await this.replaceMath(processable);
    this.push(transformed);
  }

  private getProcessableLength(text: string): number {
    let insideInline = false;
    let insideDisplay = false;
    let openingIndex = -1;

    let i = 0;
    while (i < text.length) {
      if (text[i] !== "$" || this.isEscaped(text, i)) {
        i += 1;
        continue;
      }

      if (!insideInline && !insideDisplay) {
        if (i + 1 < text.length && text[i + 1] === "$" && !this.isEscaped(text, i + 1)) {
          insideDisplay = true;
          openingIndex = i;
          i += 2;
          continue;
        }

        insideInline = true;
        openingIndex = i;
        i += 1;
        continue;
      }

      if (insideDisplay) {
        if (i + 1 < text.length && text[i + 1] === "$" && !this.isEscaped(text, i + 1)) {
          insideDisplay = false;
          openingIndex = -1;
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }

      insideInline = false;
      openingIndex = -1;
      i += 1;
    }

    return openingIndex >= 0 ? openingIndex : text.length;
  }

  private isEscaped(text: string, index: number): boolean {
    let backslashes = 0;
    for (let i = index - 1; i >= 0 && text[i] === "\\"; i -= 1) {
      backslashes += 1;
    }
    return backslashes % 2 === 1;
  }

  private async replaceMath(text: string): Promise<string> {
    const matches = detectLatex(text);
    if (matches.length === 0) {
      return text;
    }

    let output = "";
    let cursor = 0;

    for (const match of matches) {
      output += text.slice(cursor, match.startIndex);
      output += await this.renderMatch(match);
      cursor = match.endIndex;
    }

    output += text.slice(cursor);
    return output;
  }

  private async renderMatch(match: LatexMatch): Promise<string> {
    try {
      const renderer = this.options.renderFormula ?? renderLatex;
      const termRenderer = this.options.renderTerminal ?? renderToTerminal;

      const rendered = await renderer(match.tex, {
        displayMode: match.displayMode,
        fontSize: this.options.fontSize,
        backgroundColor: this.options.backgroundColor
      });

      return await termRenderer(rendered.png);
    } catch (error: unknown) {
      void error;
      return match.raw;
    }
  }
}
