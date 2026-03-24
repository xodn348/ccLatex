import strip from "strip-ansi";

export const stripAnsi = (text: string): string => strip(text);
