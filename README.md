# cclatex

[![CI](https://github.com/xodn348/cclatex/actions/workflows/ci.yml/badge.svg)](https://github.com/xodn348/cclatex/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/runtime-bun-black)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)](https://www.typescriptlang.org/)

Render LaTeX expressions in terminal output as inline images.

`cclatex` supports two runtime modes:

- Pipe mode (`cclatex`): transform stdin to stdout.
- PTY wrapper mode (`cclatex-wrap`): run interactive CLIs (such as `oc`, `codex`, `claude`) without shell hook injection.

Production recommendation: keep shell startup clean and use launcher/wrapper integration instead of auto-writing rc hooks.

## Quick Start

Install globally:

```bash
npm install -g cclatex
```

For interactive AI CLIs (recommended):

```bash
cclatex-wrap -- opencode
```

For transparent daily use (no extra typing), add a local alias or launcher wrapper:

```bash
alias oc='cclatex-wrap -- opencode'
```

For one-shot pipe usage:

```bash
echo 'The formula $E=mc^2$' | cclatex
```

Run without install (pipe mode):

```bash
npx cclatex
```

## Using with Claude Code

Requirements:

- Node.js 18+ or Bun
- iTerm2 on macOS for inline image support

Install:

```bash
npm install -g cclatex
```

Launch Claude Code through the PTY wrapper:

```bash
cclatex-wrap -- claude
# or, depending on your local binary name:
cclatex-wrap -- claude-code
```

`cclatex` defaults (`fontSize=12`, `density=150`) are tuned for narrow ~80-column terminals like Claude Code, so formulas render compactly and fit better without overwhelming the terminal width.

Alias tip for daily use:

```bash
alias claude='cclatex-wrap -- claude'
```

## How To Use

### 1) Pipe mode (simple streams)

```bash
echo 'The formula $E=mc^2$' | cclatex
opencode | cclatex
```

Pipe mode is best when your command naturally writes to stdout and does not require an interactive terminal.

### 2) PTY wrapper mode (interactive CLIs)

```bash
cclatex-wrap oc
cclatex-wrap codex
cclatex-wrap --font-size 24 --background "#ffffff" -- oc --model gpt-5
```

Use `--` before wrapped command flags so wrapper flags and command flags are separated.

Wrapper options:

- `--font-size <number>` (default: `12`)
- `--background <color>` (default: `white`)

PTY wrapper mode is the recommended way for interactive AI tools because it avoids shell hook side effects.

## Optional Shell Hook (`cclatex-hook`)

Shell hook mode is optional and not the default recommendation. Use it only if you explicitly want rc-file injection.

If you want automatic wrapping via shell function injection:

```bash
cclatex-hook install --command oc --upstream opencode
source ~/.zshrc
```

Manage hook state:

```bash
cclatex-hook status --command oc
cclatex-hook remove --command oc
```

Bypass once:

```bash
CCLATEX_NO_WRAP=1 oc
```

## Supported Terminal Output

`terminal-image` handles protocol detection and fallback (Kitty, iTerm2-compatible terminals, ANSI fallback).

## Troubleshooting

- `Command not found`: verify wrapped command exists in `PATH`.
- Wrapper issues in CI/non-interactive shells: run `cclatex-wrap` in a real terminal session (TTY).
- If wrapped output shows raw `$$...$$`, your terminal/runtime likely fell back from PTY rendering to plain passthrough.
- Unexpected hook behavior: remove with `cclatex-hook remove --command <name>` and use `cclatex-wrap` instead.

## Local Development

```bash
bun install
bun test
bun run typecheck
bun run build
```
