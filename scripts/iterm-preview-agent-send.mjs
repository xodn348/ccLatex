#!/usr/bin/env node
import { mkdirSync, statSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const DEFAULT_IMAGE = ".omx/samples/golden-render-v2/contact-sheet.png";
const requestFile = process.env.CCLATEX_ITERM_PREVIEW_JSONL || `${homedir()}/Library/Application Support/cclatex/preview.jsonl`;
const imageArg = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
const imagePath = resolve(process.cwd(), imageArg ?? DEFAULT_IMAGE);

try {
  statSync(imagePath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Image does not exist: ${imagePath}\n${message}\n`);
  process.exit(1);
}

mkdirSync(dirname(requestFile), { recursive: true });
appendFileSync(requestFile, `${JSON.stringify({ type: "image", path: imagePath, name: imagePath.split("/").pop() })}\n`);
process.stdout.write(`queued iTerm preview request: ${imagePath}\nrequest file: ${requestFile}\n`);
