import meow from "meow";
import { realpathSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { LatexTransformStream } from "./transform.js";
import type { CliFlags } from "./types.js";

const isValidBackground = (value: string): boolean => /^[#(),.%\s\w-]+$/.test(value.trim());

export const validateCliFlags = (flags: CliFlags): CliFlags => {
  if (!Number.isFinite(flags.fontSize) || flags.fontSize <= 0) {
    throw new Error("--font-size must be a positive number");
  }

  if (!flags.background.trim() || !isValidBackground(flags.background)) {
    throw new Error("--background contains invalid characters");
  }

  return flags;
};

export const createCli = (argv: string[] = process.argv.slice(2)) => {
  return meow(
    `
Usage
  $ cclatex

Options
  --font-size   Font size used by renderer (default: 20)
  --background  PNG background color (default: white)
`,
    {
      importMeta: import.meta,
      argv,
      flags: {
        fontSize: {
          type: "number",
          default: 20
        },
        background: {
          type: "string",
          default: "white"
        }
      }
    }
  );
};

export const runCli = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const cli = createCli(argv);
  const fontSize = typeof cli.flags.fontSize === "number" ? cli.flags.fontSize : 20;
  const background = typeof cli.flags.background === "string" ? cli.flags.background : "white";
  const flags: CliFlags = {
    fontSize,
    background
  };
  const validated = validateCliFlags(flags);

  const transform = new LatexTransformStream({
    fontSize: validated.fontSize,
    backgroundColor: validated.background
  });

  await pipeline(process.stdin, transform, process.stdout);
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
    return false;
  }
})();

if (isMain) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown CLI error";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
