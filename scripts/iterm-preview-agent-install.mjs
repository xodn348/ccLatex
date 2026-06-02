#!/usr/bin/env node
import { copyFileSync, mkdirSync, chmodSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "iterm-preview-agent.py");
const targetDir = `${homedir()}/Library/Application Support/iTerm2/Scripts/AutoLaunch`;
const target = `${targetDir}/cclatex_preview_agent.py`;
const dryRun = process.argv.includes("--dry-run");

statSync(source);
if (dryRun) {
  process.stdout.write(JSON.stringify({ source, target, action: "copy", restartRequired: true }, null, 2) + "\n");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
chmodSync(target, 0o755);
process.stdout.write(`installed cclatex iTerm2 preview agent:\n${target}\nRestart iTerm2 or run it from Scripts > AutoLaunch > cclatex_preview_agent.py.\n`);
