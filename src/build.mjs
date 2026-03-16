import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";

const watch = process.argv.includes("--watch");
const root = process.cwd();
const outdir = path.join(root, "dist");

mkdirSync(outdir, { recursive: true });

const common = {
  bundle: true,
  sourcemap: true,
  target: "chrome114",
  outdir,
  logLevel: "info",
};

const copies = () => {
  cpSync(path.join(root, "manifest.json"), path.join(outdir, "manifest.json"));
  cpSync(path.join(root, "src", "popup.html"), path.join(outdir, "popup.html"));
  cpSync(path.join(root, "src", "options.html"), path.join(outdir, "options.html"));
};

const run = async () => {
  await build({
    ...common,
    entryPoints: {
      popup: path.join(root, "src", "popup", "index.tsx"),
      options: path.join(root, "src", "options", "index.tsx"),
      background: path.join(root, "src", "background.ts"),
      content: path.join(root, "src", "content.ts"),
    },
    loader: {
      ".ts": "ts",
      ".tsx": "tsx",
      ".css": "css",
    },
    jsx: "automatic",
    ...(watch
      ? {
          watch: {
            onRebuild(error) {
              if (error) {
                console.error("Extension rebuild failed", error);
              } else {
                copies();
                console.log("Extension rebuilt");
              }
            },
          },
        }
      : {}),
  });

  copies();
  console.log("Extension build complete -> extension-dist/");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
