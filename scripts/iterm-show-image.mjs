#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_IMAGE = ".omx/samples/golden-render-v2/contact-sheet.png";

const args = process.argv.slice(2);
const wantsHelp = args.includes("-h") || args.includes("--help");
const dryRun = args.includes("--dry-run");
const imageArg = args.find((arg) => !arg.startsWith("-"));

if (wantsHelp) {
  process.stdout.write(`Usage\n  bun run preview:iterm [image.png]\n  node scripts/iterm-show-image.mjs [image.png]\n\nOptions\n  --dry-run  Validate the image and report the generated protocol size without printing it.\n\nDefault image\n  ${DEFAULT_IMAGE}\n`);
  process.exit(0);
}

const imagePath = resolve(process.cwd(), imageArg ?? DEFAULT_IMAGE);
let png;
let size;
try {
  size = statSync(imagePath).size;
  png = readFileSync(imagePath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to read image: ${imagePath}\n${message}\n`);
  process.exit(1);
}

if (png.length === 0) {
  process.stderr.write(`Image is empty: ${imagePath}\n`);
  process.exit(1);
}

const base64 = png.toString("base64");
const osc = `\u001b]1337;File=inline=1;preserveAspectRatio=1;size=${png.length}:${base64}\u0007`;
const inTmux = Boolean(process.env.TMUX);
const payload = inTmux
  ? `\u001bPtmux;${osc.replaceAll("\u001b", "\u001b\u001b")}\u001b\\`
  : osc;

if (dryRun) {
  process.stdout.write(JSON.stringify({ imagePath, size, bytesOut: Buffer.byteLength(payload), tmuxPassthrough: inTmux }, null, 2) + "\n");
  process.exit(0);
}

if (!process.stdout.isTTY) {
  process.stderr.write(
    "stdout is not a TTY; printing iTerm image protocol here will be captured instead of rendered.\n" +
      "Run this from a real iTerm2 pane.\n"
  );
}

process.stdout.write(payload);
process.stdout.write("\n");
