import fs from "node:fs";
import path from "node:path";

const source = path.resolve("dist/client");
const target = path.resolve("dist/vercel-demo");
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

for (const page of ["index.html", "desktop.html"]) {
  const filename = path.join(target, page);
  const html = fs.readFileSync(filename, "utf8");
  const entry = html.match(/<script type="module" crossorigin src="(\/assets\/[^"]+\.js)"><\/script>/);
  if (!entry) throw new Error(`Could not find Vite entry in ${page}`);
  fs.writeFileSync(filename, html.replace(entry[0], `<script type="module">import "/assets/kaki-demo-client.js"; await import("${entry[1]}");</script>`));
}

fs.writeFileSync(path.join(target, "vercel.json"), JSON.stringify({
  framework: null,
  buildCommand: null,
  outputDirectory: ".",
  headers: [
    { source: "/assets/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
    { source: "/(.*)", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "same-origin" }] },
  ],
}, null, 2));
fs.writeFileSync(path.join(target, ".vercelignore"), ".env.local\n.vercel\n.gitignore\n");
console.log(`Prepared browser-only Vercel demo at ${target}`);
