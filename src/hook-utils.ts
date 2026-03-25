import { basename } from "node:path";

export const HOOK_MARKER_START = "# >>> cclatex auto hook >>>";
export const HOOK_MARKER_END = "# <<< cclatex auto hook <<<";

const isValidFunctionName = (name: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
const isValidCommandToken = (value: string): boolean => /^[A-Za-z0-9_./-]+$/.test(value);

export type HookTarget = {
  functionName: string;
  upstreamCommand: string;
};

export type AiCliEntry = {
  name: string;
  binName: string;
  functionName: string;
};

export const AI_CLI_REGISTRY: AiCliEntry[] = [
  { name: "Claude",    binName: "claude",    functionName: "claude"   },
  { name: "Codex",     binName: "codex",     functionName: "codex"    },
  { name: "OpenCode",  binName: "opencode",  functionName: "oc"       },
  { name: "OpenCode",  binName: "opencode",  functionName: "opencode" },
  { name: "Aider",     binName: "aider",     functionName: "aider"    },
  { name: "Goose",     binName: "goose",     functionName: "goose"    },
  { name: "Cline",     binName: "cline",     functionName: "cline"    },
  { name: "Continue",  binName: "continue",  functionName: "continue" },
];

export const getDefaultRcPath = (shellPath: string): string => {
  const shellName = basename(shellPath || "zsh");
  if (shellName === "bash") {
    return "~/.bashrc";
  }
  return "~/.zshrc";
};

const buildInvoker = (target: HookTarget): string => {
  if (target.functionName === target.upstreamCommand) {
    return `command ${target.upstreamCommand} "$@"`;
  }
  return `${target.upstreamCommand} "$@"`;
};

export const buildHookBlock = (target: HookTarget): string => {
  if (!isValidFunctionName(target.functionName)) {
    throw new Error(`Invalid function name: ${target.functionName}`);
  }
  if (!isValidCommandToken(target.upstreamCommand)) {
    throw new Error(`Invalid upstream command: ${target.upstreamCommand}`);
  }

  const invoke = buildInvoker(target);

  return [
    HOOK_MARKER_START,
    `# command: ${target.functionName} -> ${target.upstreamCommand}`,
    `if alias ${target.functionName} >/dev/null 2>&1; then unalias ${target.functionName}; fi`,
    `${target.functionName}() {`,
    "  if [[ \"${CCLATEX_NO_WRAP:-0}\" == \"1\" ]]; then",
    `    ${invoke}`,
    "    return $?",
    "  fi",
    "",
    "  if command -v cclatex >/dev/null 2>&1; then",
    `    ${invoke} | cclatex`,
    "  else",
    `    ${invoke} | npx --yes cclatex`,
    "  fi",
    "",
    "  local statuses=(\"${pipestatus[@]}\")",
    "  local source_status=\"${statuses[1]:-0}\"",
    "  local cclatex_status=\"${statuses[2]:-0}\"",
    "",
    "  if (( source_status != 0 )); then",
    "    return \"$source_status\"",
    "  fi",
    "",
    "  return \"$cclatex_status\"",
    "}",
    HOOK_MARKER_END
  ].join("\n");
};

export const buildPtyHookBlock = (target: HookTarget): string => {
  if (!isValidFunctionName(target.functionName)) {
    throw new Error(`Invalid function name: ${target.functionName}`);
  }
  if (!isValidCommandToken(target.upstreamCommand)) {
    throw new Error(`Invalid upstream command: ${target.upstreamCommand}`);
  }
  const invoke = buildInvoker(target);
  return [
    HOOK_MARKER_START,
    `# command: ${target.functionName} -> ${target.upstreamCommand} (PTY mode)`,
    `if alias ${target.functionName} >/dev/null 2>&1; then unalias ${target.functionName}; fi`,
    `${target.functionName}() {`,
    "  if [[ \"${CCLATEX_NO_WRAP:-0}\" == \"1\" ]]; then",
    `    ${invoke}`,
    "    return $?",
    "  fi",
    "  if [[ \"${__CCLATEX_ACTIVE:-0}\" == \"1\" ]]; then",
    `    ${invoke}`,
    "    return $?",
    "  fi",
    "  if command -v cclatex-wrap >/dev/null 2>&1; then",
    "    export __CCLATEX_ACTIVE=1",
    `    cclatex-wrap ${target.upstreamCommand} "$@"`,
    "    local exit_code=$?",
    "    unset __CCLATEX_ACTIVE",
    "    return $exit_code",
    "  else",
    `    command ${target.upstreamCommand} "$@"`,
    "  fi",
    "}",
    HOOK_MARKER_END
  ].join("\n");
};

export const buildMultiPtyHookBlock = (targets: HookTarget[]): string => {
  const fnBodies: string[] = [];
  for (const target of targets) {
    if (!isValidFunctionName(target.functionName)) {
      throw new Error(`Invalid function name: ${target.functionName}`);
    }
    if (!isValidCommandToken(target.upstreamCommand)) {
      throw new Error(`Invalid upstream command: ${target.upstreamCommand}`);
    }
    const invoke = buildInvoker(target);
    fnBodies.push([
      `# command: ${target.functionName} -> ${target.upstreamCommand} (PTY mode)`,
      `if alias ${target.functionName} >/dev/null 2>&1; then unalias ${target.functionName}; fi`,
      `${target.functionName}() {`,
      "  if [[ \"${CCLATEX_NO_WRAP:-0}\" == \"1\" ]]; then",
      `    ${invoke}`,
      "    return $?",
      "  fi",
      "  if [[ \"${__CCLATEX_ACTIVE:-0}\" == \"1\" ]]; then",
      `    ${invoke}`,
      "    return $?",
      "  fi",
      "  if command -v cclatex-wrap >/dev/null 2>&1; then",
      "    export __CCLATEX_ACTIVE=1",
      `    cclatex-wrap ${target.upstreamCommand} "$@"`,
      "    local exit_code=$?",
      "    unset __CCLATEX_ACTIVE",
      "    return $exit_code",
      "  else",
      `    command ${target.upstreamCommand} "$@"`,
      "  fi",
      "}",
    ].join("\n"));
  }
  const content = fnBodies.length === 0 ? ["# No AI CLI hooks configured"] : fnBodies;
  return [HOOK_MARKER_START, ...content, HOOK_MARKER_END].join("\n");
};

export const removeHookBlock = (content: string): string => {
  const pattern = new RegExp(`${HOOK_MARKER_START}[\\s\\S]*?${HOOK_MARKER_END}\\n?`, "g");
  return content.replace(pattern, "").replace(/\n{3,}/g, "\n\n");
};

export const upsertHookBlock = (content: string, block: string): string => {
  const withoutHook = removeHookBlock(content);
  const trimmed = withoutHook.trimEnd();
  return `${trimmed}\n\n${block}\n`;
};
