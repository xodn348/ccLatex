#!/usr/bin/env node
import { createReadStream, existsSync, statSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fifoPath = process.env.CCLATEX_PREVIEW_FIFO || `/tmp/cclatex-preview-${process.getuid()}.fifo`;

const ensureFifo = () => {
  if (existsSync(fifoPath)) {
    const stat = statSync(fifoPath);
    if (stat.isFIFO()) return;
    throw new Error(`Preview path exists but is not a FIFO: ${fifoPath}`);
  }
  const result = spawnSync("mkfifo", [fifoPath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `mkfifo failed for ${fifoPath}`);
  }
};

const showImage = (line) => {
  const imagePath = line.trim();
  if (!imagePath) return;
  const result = spawnSync(process.execPath, ["scripts/iterm-show-image.mjs", imagePath], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) {
    process.stderr.write(`preview failed: ${result.error.message}\n`);
  }
};

const readOnce = () =>
  new Promise((resolveRead) => {
    let buffer = "";
    const stream = createReadStream(fifoPath, { encoding: "utf8" });
    stream.on("data", (chunk) => {
      buffer += chunk;
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        showImage(line);
      }
    });
    stream.on("end", () => {
      showImage(buffer);
      resolveRead();
    });
    stream.on("error", (error) => {
      process.stderr.write(`preview fifo read failed: ${error.message}\n`);
      resolveRead();
    });
  });

const main = async () => {
  if (process.argv.includes("--cleanup")) {
    if (existsSync(fifoPath) && statSync(fifoPath).isFIFO()) unlinkSync(fifoPath);
    return;
  }

  ensureFifo();
  process.stdout.write(`cclatex iTerm preview server ready\nFIFO: ${fifoPath}\n`);
  process.stdout.write("Send from any shell/Codex: bun run preview:send [image.png]\n\n");

  while (true) {
    await readOnce();
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
