import type { LatexMatch } from "./types.js";

const isEscaped = (text: string, index: number): boolean => {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
};

const isLikelyCurrency = (tex: string): boolean => /^\s*\d+(?:[.,]\d+)?\s*$/.test(tex);

const isValidMathBody = (tex: string): boolean => {
  const trimmed = tex.trim();
  if (!trimmed) {
    return false;
  }
  if (isLikelyCurrency(trimmed)) {
    return false;
  }
  if (/^\d/.test(trimmed) && trimmed.includes(" ") && !/[\\^_{}=]/.test(trimmed)) {
    return false;
  }
  return true;
};

export const detectLatex = (text: string): LatexMatch[] => {
  const matches: LatexMatch[] = [];

  let i = 0;
  while (i < text.length) {
    if (text[i] !== "$" || isEscaped(text, i)) {
      i += 1;
      continue;
    }

    const isDisplay = i + 1 < text.length && text[i + 1] === "$" && !isEscaped(text, i + 1);
    const delimiter = isDisplay ? "$$" : "$";
    const start = i;
    const contentStart = i + delimiter.length;

    let end = -1;
    let j = contentStart;
    while (j < text.length) {
      if (text[j] === "$" && !isEscaped(text, j)) {
        if (isDisplay) {
          if (j + 1 < text.length && text[j + 1] === "$" && !isEscaped(text, j + 1)) {
            end = j;
            break;
          }
        } else {
          end = j;
          break;
        }
      }
      j += 1;
    }

    if (end === -1) {
      i += delimiter.length;
      continue;
    }

    const content = text.slice(contentStart, end);
    if (!isValidMathBody(content)) {
      i = start + 1;
      continue;
    }

    const endIndex = end + delimiter.length;
    matches.push({
      raw: text.slice(start, endIndex),
      tex: content.trim(),
      displayMode: isDisplay,
      startIndex: start,
      endIndex
    });
    i = endIndex;
  }

  return matches;
};

export const replaceAsync = async (
  text: string,
  regex: RegExp,
  asyncReplacer: (match: RegExpExecArray) => Promise<string>
): Promise<string> => {
  if (!regex.global) {
    throw new Error("replaceAsync requires a global regex");
  }

  const parts: string[] = [];
  let lastIndex = 0;
  let match = regex.exec(text);

  while (match) {
    const matchStart = match.index;
    parts.push(text.slice(lastIndex, matchStart));

    const replacement = await asyncReplacer(match);
    parts.push(replacement);

    lastIndex = regex.lastIndex;
    match = regex.exec(text);
  }

  parts.push(text.slice(lastIndex));
  return parts.join("");
};
