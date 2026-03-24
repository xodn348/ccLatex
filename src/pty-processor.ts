import { detectLatex } from "./detector.js";
import { renderLatex } from "./renderer.js";
import { renderToTerminal } from "./terminal.js";
import type { LatexMatch, PtyProcessorOptions } from "./types.js";

type StripMap = {
  stripped: string;
  rawIndexByStrippedIndex: number[];
};

const readAnsiSequenceEnd = (text: string, start: number): number => {
  if (text[start] !== "\u001b") {
    return start;
  }

  if (start + 1 >= text.length) {
    return text.length;
  }

  const next = text[start + 1];

  if (next === "[") {
    let i = start + 2;
    while (i < text.length) {
      const code = text.charCodeAt(i);
      if (code >= 0x40 && code <= 0x7e) {
        return i + 1;
      }
      i += 1;
    }
    return text.length;
  }

  if (next === "]") {
    let i = start + 2;
    while (i < text.length) {
      if (text[i] === "\u0007") {
        return i + 1;
      }
      if (text[i] === "\u001b" && i + 1 < text.length && text[i + 1] === "\\") {
        return i + 2;
      }
      i += 1;
    }
    return text.length;
  }

  return Math.min(start + 2, text.length);
};

const buildStripMap = (rawText: string): StripMap => {
  let stripped = "";
  const rawIndexByStrippedIndex: number[] = [];

  let i = 0;
  while (i < rawText.length) {
    if (rawText[i] === "\u001b") {
      i = readAnsiSequenceEnd(rawText, i);
      continue;
    }

    rawIndexByStrippedIndex.push(i);
    stripped += rawText[i];
    i += 1;
  }

  rawIndexByStrippedIndex.push(rawText.length);

  return {
    stripped,
    rawIndexByStrippedIndex
  };
};

export class PtyLatexProcessor {
  private pending = "";

  private readonly options: PtyProcessorOptions;

  public constructor(options: PtyProcessorOptions = {}) {
    this.options = options;
  }

  public async process(data: string): Promise<string> {
    this.pending += data;
    return this.processPending(false);
  }

  public async flush(): Promise<string> {
    return this.processPending(true);
  }

  private async processPending(finalChunk: boolean): Promise<string> {
    if (!this.pending) {
      return "";
    }

    const stripMap = buildStripMap(this.pending);
    const splitIndexInStripped = finalChunk ? stripMap.stripped.length : this.getProcessableLength(stripMap.stripped);
    const splitIndexInRaw = stripMap.rawIndexByStrippedIndex[splitIndexInStripped] ?? this.pending.length;

    const processable = this.pending.slice(0, splitIndexInRaw);
    this.pending = this.pending.slice(splitIndexInRaw);

    if (!processable) {
      return "";
    }

    return this.replaceMath(processable);
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

  private async replaceMath(rawText: string): Promise<string> {
    const stripMap = buildStripMap(rawText);
    const matches = detectLatex(stripMap.stripped);
    if (matches.length === 0) {
      return rawText;
    }

    let output = "";
    let rawCursor = 0;

    for (const match of matches) {
      const rawStart = stripMap.rawIndexByStrippedIndex[match.startIndex] ?? rawText.length;
      const rawEnd = stripMap.rawIndexByStrippedIndex[match.endIndex] ?? rawText.length;

      output += rawText.slice(rawCursor, rawStart);
      output += await this.renderMatch(match);
      rawCursor = rawEnd;
    }

    output += rawText.slice(rawCursor);
    return output;
  }

  private async renderMatch(match: LatexMatch): Promise<string> {
    try {
      const renderer = this.options.renderFormula ?? renderLatex;
      const terminalRenderer = this.options.renderTerminal ?? renderToTerminal;

      const rendered = await renderer(match.tex, {
        displayMode: match.displayMode,
        fontSize: this.options.fontSize,
        backgroundColor: this.options.backgroundColor
      });

      return await terminalRenderer(rendered.png);
    } catch (error: unknown) {
      void error;
      return match.raw;
    }
  }
}
