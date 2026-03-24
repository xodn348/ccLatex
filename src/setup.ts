import { execSync } from "node:child_process";
import type { AiCliEntry } from "./hook-utils.js";

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
