export interface LatexMatch {
  raw: string;
  tex: string;
  displayMode: boolean;
  startIndex: number;
  endIndex: number;
}

export interface RenderOptions {
  displayMode: boolean;
  fontSize?: number;
  backgroundColor?: string;
}

export interface RenderResult {
  png: Buffer;
  width: number;
  height: number;
}

export type TerminalProtocol = "kitty" | "iterm2" | "sixel" | "ansi";

export interface TerminalCapabilities {
  protocol: TerminalProtocol;
  supportsImages: boolean;
}

export interface TransformOptions {
  fontSize?: number;
  backgroundColor?: string;
}

export interface CliFlags {
  fontSize: number;
  background: string;
}

export interface PtyWrapperOptions {
  command: string;
  args: string[];
  fontSize: number;
  backgroundColor: string;
  columns: number;
  rows: number;
  env: NodeJS.ProcessEnv;
}

export interface PtyProcessorOptions extends TransformOptions {
  renderFormula?: (tex: string, options: RenderOptions) => Promise<RenderResult>;
  renderTerminal?: (png: Buffer) => Promise<string>;
}
