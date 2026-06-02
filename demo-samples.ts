/**
 * Demo: Compare 3 LaTeX rendering approaches in terminal
 * Run: bun run demo-samples.ts
 */
import { renderLatex } from "./src/renderer.js";
import terminalImage from "terminal-image";

const FORMULAS = [
  {
    name: "Integral (Bose-Einstein)",
    tex: String.raw`\int_0^\infty \frac{x^3}{e^x - 1}\,dx = \frac{\pi^4}{15}`,
  },
  {
    name: "Taylor Series (sin x)",
    tex: String.raw`\sum_{n=0}^{\infty} \frac{(-1)^n}{(2n+1)!}\,x^{2n+1}`,
  },
  {
    name: "Maxwell (Faraday's Law)",
    tex: String.raw`\nabla \times \vec{E} = -\frac{\partial \vec{B}}{\partial t}`,
  },
  {
    name: "Matrix (2x2)",
    tex: String.raw`\begin{pmatrix} a & b \\ c & d \end{pmatrix} \begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} ax + by \\ cx + dy \end{pmatrix}`,
  },
];

const separator = (label: string) => {
  const line = "═".repeat(70);
  console.log(`\n\x1b[36m╔${line}╗\x1b[0m`);
  console.log(`\x1b[36m║\x1b[0m \x1b[1;33m${label.padEnd(69)}\x1b[36m║\x1b[0m`);
  console.log(`\x1b[36m╚${line}╝\x1b[0m\n`);
};

const subHeader = (label: string) => {
  console.log(`  \x1b[1;32m▸ ${label}\x1b[0m`);
  console.log(`  ${"─".repeat(50)}`);
};

// ═══════════════════════════════════════════════════════════════
// APPROACH 1: Enlarged image (current pipeline, bigger params)
// ═══════════════════════════════════════════════════════════════
const approach1 = async () => {
  separator("APPROACH 1: Enlarged Image (fontSize=48, width=80%)");
  console.log("  Current MathJax→SVG→PNG pipeline with larger fontSize & terminal width.\n");

  for (const f of FORMULAS) {
    subHeader(f.name);
    console.log(`  TeX: ${f.tex}\n`);
    const result = await renderLatex(f.tex, {
      displayMode: true,
      fontSize: 48,
      backgroundColor: "white",
    });
    const img = await terminalImage.buffer(result.png, {
      width: "80%",
      preserveAspectRatio: true,
    });
    console.log(img);
  }
};

// ═══════════════════════════════════════════════════════════════
// APPROACH 1B: Even larger fontSize for comparison
// ═══════════════════════════════════════════════════════════════
const approach1b = async () => {
  separator("APPROACH 1B: Extra-Large Image (fontSize=72, width=90%)");
  console.log("  Same pipeline but pushed to fontSize=72 for max readability.\n");

  for (const f of FORMULAS) {
    subHeader(f.name);
    console.log(`  TeX: ${f.tex}\n`);
    const result = await renderLatex(f.tex, {
      displayMode: true,
      fontSize: 72,
      backgroundColor: "white",
    });
    const img = await terminalImage.buffer(result.png, {
      width: "90%",
      preserveAspectRatio: true,
    });
    console.log(img);
  }
};

// ═══════════════════════════════════════════════════════════════
// APPROACH 2: ANSI-enhanced Unicode art (manual approximation)
// ═══════════════════════════════════════════════════════════════
const approach2 = async () => {
  separator("APPROACH 2: ANSI-Enhanced Unicode Art");
  console.log("  Pure text rendering with Unicode math symbols + ANSI styling.");
  console.log("  No external images — works in ANY terminal.\n");

  const B = "\x1b[1m";    // bold
  const D = "\x1b[2m";    // dim
  const I = "\x1b[3m";    // italic
  const C = "\x1b[36m";   // cyan
  const Y = "\x1b[33m";   // yellow
  const G = "\x1b[32m";   // green
  const R = "\x1b[0m";    // reset

  // Formula 1: Integral
  subHeader("Integral (Bose-Einstein)");
  console.log(`  TeX: ${FORMULAS[0].tex}\n`);
  console.log(`   ${C}∞${R}`);
  console.log(`  ${C}⌠${R}      ${B}x³${R}`);
  console.log(`  ${C}⎮${R}   ${D}───────${R}  ${I}dx${R}  ${Y}=${R}  ${B}π⁴${R}`);
  console.log(`  ${C}⌡${R}    ${B}eˣ - 1${R}      ${D}──${R}`);
  console.log(`   ${C}0${R}               ${B}15${R}`);
  console.log();

  // Formula 2: Taylor Series
  subHeader("Taylor Series (sin x)");
  console.log(`  TeX: ${FORMULAS[1].tex}\n`);
  console.log(`   ${C}∞${R}`);
  console.log(`   ${C}Σ${R}    ${B}(-1)ⁿ${R}`);
  console.log(`  ${C}n=0${R}  ${D}────────${R} · ${B}x${R}${G}²ⁿ⁺¹${R}`);
  console.log(`       ${B}(2n+1)!${R}`);
  console.log();

  // Formula 3: Maxwell's equation
  subHeader("Maxwell (Faraday's Law)");
  console.log(`  TeX: ${FORMULAS[2].tex}\n`);
  console.log(`                  ${B}∂${G}B⃗${R}`);
  console.log(`  ${B}∇${R} ${Y}×${R} ${G}E⃗${R}  ${Y}=${R}  ${Y}-${R}${D}───${R}`);
  console.log(`                  ${B}∂${I}t${R}`);
  console.log();

  // Formula 4: Matrix
  subHeader("Matrix (2x2)");
  console.log(`  TeX: ${FORMULAS[3].tex}\n`);
  console.log(`  ${C}⎛${R} ${B}a  b${R} ${C}⎞${R}  ${C}⎛${R} ${B}x${R} ${C}⎞${R}     ${C}⎛${R} ${B}ax + by${R} ${C}⎞${R}`);
  console.log(`  ${C}⎜${R}      ${C}⎟${R}  ${C}⎜${R}   ${C}⎟${R}  ${Y}=${R}  ${C}⎜${R}         ${C}⎟${R}`);
  console.log(`  ${C}⎝${R} ${B}c  d${R} ${C}⎠${R}  ${C}⎝${R} ${B}y${R} ${C}⎠${R}     ${C}⎝${R} ${B}cx + dy${R} ${C}⎠${R}`);
  console.log();
};

// ═══════════════════════════════════════════════════════════════
// APPROACH 3: Hybrid (image + protocol detection concept)
// ═══════════════════════════════════════════════════════════════
const approach3 = async () => {
  separator("APPROACH 3: Hybrid (Kitty/iTerm2/Sixel image + ANSI fallback)");
  console.log("  Uses native image protocols when available, falls back to ANSI art.");
  console.log("  This demo shows what Kitty Graphics Protocol output looks like.\n");

  for (const f of FORMULAS) {
    subHeader(f.name);
    console.log(`  TeX: ${f.tex}\n`);

    // Render the high-quality image
    const result = await renderLatex(f.tex, {
      displayMode: true,
      fontSize: 48,
      backgroundColor: "white",
    });

    // Try Kitty Graphics Protocol (base64 PNG directly)
    const isKitty = process.env.TERM === "xterm-kitty" || process.env.KITTY_PID;
    const isIterm = process.env.TERM_PROGRAM === "iTerm.app" || process.env.LC_TERMINAL === "iTerm2";

    if (isKitty) {
      // Kitty: native image protocol — pixel-perfect
      const b64 = result.png.toString("base64");
      const chunks: string[] = [];
      for (let i = 0; i < b64.length; i += 4096) {
        const chunk = b64.slice(i, i + 4096);
        const more = i + 4096 < b64.length ? 1 : 0;
        chunks.push(`\x1b_Gf=100,a=T,m=${more};${chunk}\x1b\\`);
      }
      console.log(chunks.join(""));
    } else if (isIterm) {
      // iTerm2: inline image protocol
      const b64 = result.png.toString("base64");
      console.log(`\x1b]1337;File=inline=1;width=auto;preserveAspectRatio=1:${b64}\x07`);
    } else {
      // Fallback: terminal-image ANSI art (same as approach 1)
      console.log("  \x1b[2m[Fallback: no Kitty/iTerm2 detected — using ANSI art]\x1b[0m");
      const img = await terminalImage.buffer(result.png, {
        width: "80%",
        preserveAspectRatio: true,
      });
      console.log(img);
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
const main = async () => {
  console.log("\x1b[1;37m");
  console.log("  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║   cclatex Rendering Approach Comparison Demo            ║");
  console.log("  ║   Complex formulas × 3 approaches                      ║");
  console.log("  ╚══════════════════════════════════════════════════════════╝");
  console.log("\x1b[0m");

  await approach1();
  await approach1b();
  await approach2();
  await approach3();

  console.log("\n\x1b[1;37m═══ END OF DEMO ═══\x1b[0m\n");
  console.log("Compare above and pick:");
  console.log("  1  = Enlarged image (simple, current pipeline)");
  console.log("  1B = Extra-large image (max readability)");
  console.log("  2  = ANSI Unicode art (universal, no images)");
  console.log("  3  = Hybrid (best quality when protocol supported, ANSI fallback)");
  console.log();
};

main().catch(console.error);
