import { execSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AI_CLI_REGISTRY,
  buildMultiPtyHookBlock,
  getDefaultRcPath,
  upsertHookBlock,
  type AiCliEntry,
} from "./hook-utils.js";

type ExecFn = (cmd: string, opts: object) => unknown;

export const detectInstalledClis = (
  registry: AiCliEntry[],
  exec: ExecFn = execSync,
): AiCliEntry[] => {
  const installedBins = new Set<string>();

  const uniqueBins = [...new Set(registry.map((e) => e.binName))];

  for (const binName of uniqueBins) {
    try {
      exec(`command -v ${binName}`, { stdio: "ignore", shell: "/bin/sh" });
      installedBins.add(binName);
    } catch {
      // Binary not found in PATH — skip
    }
  }

  return registry.filter((entry) => installedBins.has(entry.binName));
};

type FsFns = {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string) => string;
  writeFileSync: (p: string, c: string) => void;
};

const defaultFsFns: FsFns = {
  existsSync,
  readFileSync: (p: string) => readFileSync(p, "utf8"),
  writeFileSync: (p: string, c: string) => writeFileSync(p, c, "utf8"),
};

const resolveHomePath = (value: string): string => {
  if (value.startsWith("~/")) {
    return resolve(homedir(), value.slice(2));
  }
  return resolve(value);
};

type RunSetupOptions = {
  rc?: string;
  detectFn?: () => AiCliEntry[];
  fsFns?: FsFns;
};

export const runSetup = (options: RunSetupOptions = {}): void => {
  const {
    rc,
    detectFn = () => detectInstalledClis(AI_CLI_REGISTRY),
    fsFns = defaultFsFns,
  } = options;

  const rcPath = rc
    ? resolveHomePath(rc)
    : resolveHomePath(getDefaultRcPath(process.env.SHELL ?? "/bin/zsh"));

  const installed = detectFn();

  if (installed.length === 0) {
    console.log("No AI CLI tools found");
    return;
  }

  console.log(`Installing hooks for: ${installed.map((e) => e.functionName).join(", ")}`);

  const targets = installed.map((e) => ({
    functionName: e.functionName,
    upstreamCommand: e.binName,
  }));

  const block = buildMultiPtyHookBlock(targets);
  const existing = fsFns.existsSync(rcPath) ? fsFns.readFileSync(rcPath) : "";
  const next = upsertHookBlock(existing, block);
  fsFns.writeFileSync(rcPath, next);
};

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    const entryPath = realpathSync(process.argv[1]);
    const currentPath = realpathSync(fileURLToPath(import.meta.url));
    return entryPath === currentPath;
  } catch {
    return false;
  }
})();

if (isMain) {
  let rc: string | undefined;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--rc" && argv[i + 1]) {
      rc = argv[i + 1];
      i++;
    }
  }
  try {
    runSetup({ rc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown setup error";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}
