import sharp from "sharp";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import terminalImage from "terminal-image";

const formula = "\\frac{x^2 + 1}{x - 1}";

// Render SVG at given density (DPI). Default sharp density is 72.
async function renderAtDensity(svg: string, density: number, label: string) {
  const png = await sharp(Buffer.from(svg), { density })
    .flatten({ background: "white" })
    .png()
    .toBuffer();
  const meta = await sharp(png).metadata();
  console.log(`\n📏 ${label} (density=${density}): PNG ${meta.width}x${meta.height}px`);
  const ansi = await terminalImage.buffer(png, { width: "100%", preserveAspectRatio: true });
  console.log(ansi);
}

// Render SVG resized to explicit pixel width
async function renderAtWidth(svg: string, targetWidth: number, label: string) {
  const png = await sharp(Buffer.from(svg), { density: 300 })
    .flatten({ background: "white" })
    .resize(targetWidth)
    .png()
    .toBuffer();
  const meta = await sharp(png).metadata();
  console.log(`\n📏 ${label} (resize to ${targetWidth}px): PNG ${meta.width}x${meta.height}px`);
  const ansi = await terminalImage.buffer(png, { width: "100%", preserveAspectRatio: true });
  console.log(ansi);
}

async function demo() {
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const tex = new TeX({ packages: ["base", "ams"] });
  const svg = new SVG({ fontCache: "none" });
  const doc = mathjax.document("", { InputJax: tex, OutputJax: svg });

  const node = doc.convert(formula, { display: true, em: 16, ex: 8, containerWidth: 1280 });
  const svgMarkup = (() => {
    const html = adaptor.outerHTML(node);
    const match = html.match(/<svg[\s\S]*<\/svg>/i);
    return match ? match[0] : html;
  })();

  console.log("=== cclatex Density Demo ===");
  console.log(`SVG preview (first 200 chars): ${svgMarkup.slice(0, 200)}\n`);

  // Test density scaling
  await renderAtDensity(svgMarkup, 72, "DEFAULT");
  await renderAtDensity(svgMarkup, 144, "2x (144dpi)");
  await renderAtDensity(svgMarkup, 300, "HIGH (300dpi)");
  await renderAtDensity(svgMarkup, 600, "ULTRA (600dpi)");

  // Test explicit pixel widths
  await renderAtWidth(svgMarkup, 400, "400px wide");
  await renderAtWidth(svgMarkup, 800, "800px wide");

  console.log("\n=== Terminal ===");
  console.log(`TERM_PROGRAM: ${process.env.TERM_PROGRAM}`);
  console.log(`COLORTERM: ${process.env.COLORTERM}`);
}

demo().catch(console.error);
