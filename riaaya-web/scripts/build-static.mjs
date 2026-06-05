import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const distAssets = join(dist, "assets");

await rm(dist, { recursive: true, force: true });
await mkdir(distAssets, { recursive: true });

await cp(join(root, "index.html"), join(dist, "index.html"));

const appHtml = await readFile(join(root, "app.html"), "utf8");
await writeFile(
  join(dist, "app.html"),
  appHtml
    .replace('href="app.css"', 'href="assets/riaaya-app.css"')
    .replace('src="app.js"', 'src="assets/riaaya-app.js"')
);

await cp(join(root, "app.css"), join(distAssets, "riaaya-app.css"));
await cp(join(root, "app.js"), join(distAssets, "riaaya-app.js"));
await cp(join(root, "assets"), distAssets, { recursive: true });
