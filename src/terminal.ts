import terminalImage from "terminal-image";

type TerminalRenderOptions = {
  width?: string | number;
};

export const renderToTerminal = async (
  png: Buffer,
  options: TerminalRenderOptions = {}
): Promise<string> => {
  if (png.length === 0) {
    throw new Error("PNG buffer is empty");
  }

  return terminalImage.buffer(png, {
    width: options.width ?? "50%",
    preserveAspectRatio: true
  });
};
