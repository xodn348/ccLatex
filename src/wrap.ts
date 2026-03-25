import * as pty from "node-pty";
import { accessSync, constants, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PtyLatexProcessor } from "./pty-processor.js";
import { validateCliFlags } from "./cli.js";
import type { CliFlags, PtyWrapperOptions } from "./types.js";

type ParsedWrapArgs = {
  command: string;
  args: string[];
  flags: CliFlags;
};

const WRAP_USAGE =
  "Usage: cclatex-wrap [--font-size <number>] [--background <color>] -- <command> [args...]\n" +
  "   or: cclatex-wrap [--font-size <number>] [--background <color>] <command> [args...]\n";

const toPositiveDimension = (value: number | undefined, fallback: number): number => {
  if (typeof value !== "number") {
    return fallback;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};

const sanitizeEnv = (source: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  return env;
};

export const parseWrapArgs = (argv: string[]): ParsedWrapArgs => {
  let fontSize = 20;
  let background = "white";

  let i = 0;
  while (i < argv.length) {
    const token = argv[i];

    if (token === "--") {
      const commandWithArgs = argv.slice(i + 1);
      if (commandWithArgs.length === 0) {
        throw new Error(WRAP_USAGE);
      }

      const [command, ...args] = commandWithArgs;
      return {
        command,
        args,
        flags: validateCliFlags({ fontSize, background })
      };
    }

    if (token === "--font-size") {
      const nextValue = argv[i + 1];
      if (!nextValue) {
        throw new Error("Missing value for --font-size");
      }

      const parsed = Number(nextValue);
      fontSize = parsed;
      i += 2;
      continue;
    }

    if (token === "--background") {
      const nextValue = argv[i + 1];
      if (!nextValue) {
        throw new Error("Missing value for --background");
      }

      background = nextValue;
      i += 2;
      continue;
    }

    if (token.startsWith("--")) {
      throw new Error(`Unknown option: ${token}. Use -- before your command to pass command flags.`);
    }

    return {
      command: token,
      args: argv.slice(i + 1),
      flags: validateCliFlags({ fontSize, background })
    };
  }

  throw new Error(WRAP_USAGE);
};

const createWrapperOptions = (parsed: ParsedWrapArgs): PtyWrapperOptions => {
  return {
    command: parsed.command,
    args: parsed.args,
    fontSize: parsed.flags.fontSize,
    backgroundColor: parsed.flags.background,
    columns: toPositiveDimension(process.stdout.columns, 80),
    rows: toPositiveDimension(process.stdout.rows, 24),
    env: {
      ...sanitizeEnv(process.env),
      TERM: process.env.TERM || "xterm-256color"
    }
  };
};

const isErrnoException = (value: unknown): value is NodeJS.ErrnoException => {
  return typeof value === "object" && value !== null;
};

const commandExists = (command: string, env: NodeJS.ProcessEnv): boolean => {
  if (command.includes("/")) {
    try {
      accessSync(command, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  const probe = spawnSync("which", [command], {
    env,
    stdio: "ignore"
  });

  return probe.status === 0;
};

const toSpawnFailureCode = (error: NodeJS.ErrnoException): number => {
  if (error.code === "ENOENT") {
    return 127;
  }
  if (error.code === "EACCES") {
    return 126;
  }
  return 1;
};

export const runWithoutPtyFallback = (options: PtyWrapperOptions): number => {
  const result = spawnSync(options.command, options.args, {
    cwd: process.cwd(),
    env: options.env,
    stdio: "inherit"
  });

  if (result.error) {
    const error = result.error;
    if (isErrnoException(error) && error.code === "ENOENT") {
      process.stderr.write(`Command not found: ${options.command}\n`);
      return 127;
    }

    const message = error instanceof Error ? error.message : "Failed to run command without PTY";
    process.stderr.write(`${message}\n`);
    return isErrnoException(error) ? toSpawnFailureCode(error) : 1;
  }

  if (typeof result.status === "number") {
    return result.status;
  }

  return 1;
};

const runWrappedCommand = async (options: PtyWrapperOptions): Promise<number> => {
  let child: pty.IPty;

  try {
    child = pty.spawn(options.command, options.args, {
      name: "xterm-color",
      cols: options.columns,
      rows: options.rows,
      cwd: process.cwd(),
      env: options.env,
      handleFlowControl: true
    });
  } catch (error: unknown) {
    if (
      isErrnoException(error) &&
      (error.code === "ENOENT" ||
        (typeof error.message === "string" &&
          error.message.includes("posix_spawnp failed") &&
          !commandExists(options.command, options.env)))
    ) {
      process.stderr.write(`Command not found: ${options.command}\n`);
      return 127;
    }

    if (
      isErrnoException(error) &&
      typeof error.message === "string" &&
      error.message.includes("posix_spawnp failed")
    ) {
      return runWithoutPtyFallback(options);
    }

    throw error;
  }

  const processor = new PtyLatexProcessor({
    fontSize: options.fontSize,
    backgroundColor: options.backgroundColor
  });

  return await new Promise<number>((resolve, reject) => {
    let completed = false;
    let queue = Promise.resolve();

    const stdinHandler = (chunk: Buffer | string): void => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      child.write(text);
    };

    const resizeHandler = (): void => {
      const cols = toPositiveDimension(process.stdout.columns, 80);
      const rows = toPositiveDimension(process.stdout.rows, 24);

      if (cols <= 0 || rows <= 0) {
        return;
      }

      try {
        child.resize(cols, rows);
      } catch (error: unknown) {
        if (
          isErrnoException(error) &&
          (error.code === "EBADF" || (typeof error.message === "string" && error.message.includes("already exited")))
        ) {
          return;
        }
        const message = error instanceof Error ? error.message : "resize failed";
        process.stderr.write(`${message}\n`);
      }
    };

    const settle = (resolver: () => void): void => {
      if (completed) {
        return;
      }
      completed = true;

      dataDisposable.dispose();
      exitDisposable.dispose();
      process.stdin.off("data", stdinHandler);
      process.stdout.off("resize", resizeHandler);

      if (process.stdin.isTTY) {
        try {
          process.stdin.setRawMode(false);
        } catch {
          // setRawMode may fail in non-TTY contexts — safe to ignore
        }
      }

      resolver();
    };

    const dataDisposable = child.onData((data: string) => {
      queue = queue.then(async () => {
        const transformed = await processor.process(data);
        if (transformed) {
          process.stdout.write(transformed);
        }
      }).catch((_err: unknown) => {
        // queue processing error — data may be dropped
      });
    });

    const exitDisposable = child.onExit(({ exitCode }) => {
      void queue
        .then(async () => {
          const tail = await processor.flush();
          if (tail) {
            process.stdout.write(tail);
          }
        })
        .then(() => {
          settle(() => resolve(exitCode));
        })
        .catch((error: unknown) => {
          settle(() => reject(error instanceof Error ? error : new Error("Failed to flush PTY output")));
        });
    });

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on("data", stdinHandler);

    process.stdout.on("resize", resizeHandler);
  });
};

export const runWrap = async (argv: string[] = process.argv.slice(2)): Promise<number> => {
  const parsed = parseWrapArgs(argv);
  const options = createWrapperOptions(parsed);
  return await runWrappedCommand(options);
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
  runWrap()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown wrapper error";
      process.stderr.write(`${message}\n`);
      process.stderr.write(WRAP_USAGE);
      process.exit(1);
    });
}
