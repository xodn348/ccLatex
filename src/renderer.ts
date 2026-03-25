import sharp from "sharp";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import type { RenderOptions, RenderResult } from "./types.js";

type MathJaxContext = {
  convert: (tex: string, displayMode: boolean, fontSize: number) => string;
};

const extractSvgRoot = (markup: string): string => {
  const match = markup.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) {
    throw new Error("MathJax output did not contain an SVG root");
  }
  return match[0];
};

let contextPromise: Promise<MathJaxContext> | null = null;

const initMathJax = async (): Promise<MathJaxContext> => {
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);

  const tex = new TeX({
    packages: ["base", "ams", "newcommand", "configmacros"]
  });
  const svg = new SVG({
    fontCache: "none"
  });
  const doc = mathjax.document("", {
    InputJax: tex,
    OutputJax: svg
  });

  return {
    convert: (formula: string, displayMode: boolean, fontSize: number): string => {
      const node = doc.convert(formula, {
        display: displayMode,
        em: fontSize,
        ex: fontSize / 2,
        containerWidth: 80 * fontSize
      });
      return extractSvgRoot(adaptor.outerHTML(node));
    }
  };
};

const getMathJaxContext = async (): Promise<MathJaxContext> => {
  if (!contextPromise) {
    contextPromise = initMathJax();
  }
  return contextPromise;
};

export const renderLatex = async (
  formula: string,
  options: RenderOptions
): Promise<RenderResult> => {
  const fontSize = options.fontSize ?? 12;
  const backgroundColor = options.backgroundColor ?? "transparent";
  const textColor = options.textColor ?? (backgroundColor === "transparent" ? "white" : "black");
  const context = await getMathJaxContext();

  let svgMarkup = context.convert(formula, options.displayMode, fontSize);

  // Inject text color into SVG for dark terminal compatibility
  // MathJax SVG already has a style attribute, so we must merge into it (not add a duplicate)
  if (svgMarkup.match(/<svg[^>]*style="[^"]*"/i)) {
    svgMarkup = svgMarkup.replace(
      /(<svg[^>]*style=")/i,
      `$1color: ${textColor}; `
    );
  } else {
    svgMarkup = svgMarkup.replace(
      /(<svg[^>]*)(>)/i,
      `$1 style="color: ${textColor}"$2`
    );
  }

  let pipeline = sharp(Buffer.from(svgMarkup), { density: 150 });

  // Only flatten (add opaque background) when explicitly requested
  if (backgroundColor !== "transparent") {
    pipeline = pipeline.flatten({ background: backgroundColor });
  }

  const png = await pipeline.png().toBuffer();

  const metadata = await sharp(png).metadata();

  return {
    png,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0
  };
};
