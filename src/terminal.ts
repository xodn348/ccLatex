import ansiEscapes from "ansi-escapes";

type TerminalRenderOptions = {
  width?: string | number;
  imageWidth?: number;
};

const isITerm2 = (): boolean => {
  return (
    process.env.TERM_PROGRAM === "iTerm.app" ||
    process.env.LC_TERMINAL === "iTerm2"
  );
};

/** Convert 300dpi pixel width to approximate character-cell width for iTerm2 display */
const computeDisplayWidth = (pixelWidth: number): number => {
  // Scale from 300dpi render to 72dpi screen equivalent, then to char cells (~8px each)
  const screenPixels = pixelWidth * (72 / 150);
  return Math.max(2, Math.round(screenPixels / 8));
};

export const renderToTerminal = async (
  png: Buffer,
  options: TerminalRenderOptions = {}
): Promise<string> => {
  if (png.length === 0) {
    throw new Error("PNG buffer is empty");
  }

  if (!isITerm2()) {
    throw new Error(
      "cclatex requires iTerm2. Your terminal is not supported.\n" +
        "Please install iTerm2: https://iterm2.com"
    );
  }

  // Determine display width: explicit > computed from image > omit (native size)
  const width =
    options.width ??
    (options.imageWidth ? computeDisplayWidth(options.imageWidth) : undefined);

  return ansiEscapes.image(png, {
    preserveAspectRatio: true,
    ...(typeof width === "number" ? { width } : {})
  });
};
