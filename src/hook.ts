import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPtyHookBlock,
  getDefaultRcPath,
  removeHookBlock,
  upsertHookBlock,
  type HookTarget
} from "./hook-utils.js";

type HookCommand = "install" | "remove" | "status";

type HookCliOptions = {
  command: HookCommand;
  functionName: string;
  upstreamCommand: string;
  rcPath: string;
};

const resolveHomePath = (value: string): string => {
  if (value.startsWith("~/")) {
    return resolve(homedir(), value.slice(2));
  }
  return resolve(value);
};

const parseCliOptions = (argv: string[]): HookCliOptions => {
  const command = (argv[0] as HookCommand | undefined) ?? "install";
  if (!["install", "remove", "status"].includes(command)) {
    throw new Error("Usage: cclatex-hook [install|remove|status] [--command <name>] [--upstream <cmd>] [--rc <path>]");
  }

  let functionName = "opencode";
  let upstreamCommand = "opencode";
  let rcPath = getDefaultRcPath(process.env.SHELL ?? "/bin/zsh");

  let i = 1;
  while (i < argv.length) {
    const token = argv[i];
    const value = argv[i + 1];
    if (!value) {
      throw new Error(`Missing value for ${token}`);
    }

    if (token === "--command") {
      functionName = value;
      i += 2;
      continue;
    }
    if (token === "--upstream") {
      upstreamCommand = value;
      i += 2;
      continue;
    }
    if (token === "--rc") {
      rcPath = value;
      i += 2;
      continue;
    }
    throw new Error(`Unknown flag: ${token}`);
  }

  return {
    command,
    functionName,
    upstreamCommand,
    rcPath: resolveHomePath(rcPath)
  };
};

const readRcFile = (path: string): string => {
  if (!existsSync(path)) {
    return "";
  }
  return readFileSync(path, "utf8");
};

const writeRcFile = (path: string, content: string): void => {
  writeFileSync(path, content, "utf8");
};

const handleInstall = (path: string, target: HookTarget): void => {
  const existing = readRcFile(path);
  const block = buildPtyHookBlock(target);
  const next = upsertHookBlock(existing, block);
  writeRcFile(path, next);
  process.stdout.write(`Installed cclatex hook for '${target.functionName}' in ${path}\n`);
};

const handleRemove = (path: string): void => {
  const existing = readRcFile(path);
  const next = removeHookBlock(existing);
  writeRcFile(path, next);
  process.stdout.write(`Removed cclatex hook from ${path}\n`);
};

const handleStatus = (path: string): void => {
  const existing = readRcFile(path);
  const installed = existing.includes("# >>> cclatex auto hook >>>");
  process.stdout.write(installed ? `installed (${path})\n` : `not installed (${path})\n`);
};

export const runHookCli = (argv: string[] = process.argv.slice(2)): void => {
  const options = parseCliOptions(argv);
  const target: HookTarget = {
    functionName: options.functionName,
    upstreamCommand: options.upstreamCommand
  };

  if (options.command === "install") {
    handleInstall(options.rcPath, target);
    return;
  }
  if (options.command === "remove") {
    handleRemove(options.rcPath);
    return;
  }
  handleStatus(options.rcPath);
};

const isMain = (() => {
  if (!process.argv[1]) {
    return false;
  }

  try {
    const entryPath = realpathSync(process.argv[1]);
    const currentPath = realpathSync(fileURLToPath(import.meta.url));
    return entryPath === currentPath;
  } catch {
    // realpathSync may fail if argv[1] path does not exist — treat as non-main
    return false;
  }
})();

if (isMain) {
  try {
    runHookCli();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown hook error";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}
