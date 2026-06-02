#!/usr/bin/env node
import { constants, openSync, writeSync, closeSync, statSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_IMAGE = ".omx/samples/golden-render-v2/contact-sheet.png";
const fifoPath = process.env.CCLATEX_PREVIEW_FIFO || `/tmp/cclatex-preview-${process.getuid()}.fifo`;
const imageArg = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
const imagePath = resolve(process.cwd(), imageArg ?? DEFAULT_IMAGE);

try {
  statSync(imagePath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Image does not exist: ${imagePath}\n${message}\n`);
  process.exit(1);
}

let fd;
try {
  fd = openSync(fifoPath, constants.O_WRONLY | constants.O_NONBLOCK);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `Preview server is not listening on ${fifoPath}.\n` +
      "Start it in a real iTerm2 pane with: bun run preview:server\n" +
      `${message}\n`
  );
  process.exit(1);
}

try {
  writeSync(fd, `${imagePath}\n`);
  process.stdout.write(`sent preview request: ${imagePath}\n`);
} finally {
  closeSync(fd);
}
