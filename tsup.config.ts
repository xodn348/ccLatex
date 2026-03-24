import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      cli: "src/cli.ts",
      hook: "src/hook.ts",
      index: "src/index.ts",
      setup: "src/setup.ts",
      wrap: "src/wrap.ts"
    },
    format: ["esm"],
    splitting: false,
    dts: true,
    clean: true,
    sourcemap: true,
    banner: {
      js: "#!/usr/bin/env node"
    }
  }
]);
