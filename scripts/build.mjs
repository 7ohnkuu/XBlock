import * as esbuild from "esbuild"
import { cpSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const watch = process.argv.includes("--watch")

const ctx = await esbuild.context({
  absWorkingDir: root,
  entryPoints: {
    "background/sw": "src/background/sw.ts",
    "content/boot": "src/content/boot.ts",
    "options/options": "src/options/options.ts",
  },
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: ["chrome114"],
  sourcemap: true,
  logLevel: "info",
})

function copyStatic() {
  mkdirSync(join(root, "dist/options"), { recursive: true })
  mkdirSync(join(root, "dist/icons"), { recursive: true })
  cpSync(join(root, "src/manifest.json"), join(root, "dist/manifest.json"))
  cpSync(join(root, "src/options/index.html"), join(root, "dist/options/index.html"))
  cpSync(join(root, "src/options/options.css"), join(root, "dist/options/options.css"))
  cpSync(join(root, "src/icons"), join(root, "dist/icons"), { recursive: true })
  cpSync(join(root, "src/_locales"), join(root, "dist/_locales"), { recursive: true })
}

copyStatic()

if (watch) {
  await ctx.watch()
  console.log("watching…")
} else {
  await ctx.rebuild()
  await ctx.dispose()
}
