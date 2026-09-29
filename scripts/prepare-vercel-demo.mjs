import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const source = path.resolve("dist/client");
const target = path.resolve("dist/vercel-demo");
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

// Version the demo adapter and fixtures because Vercel caches /assets for a day.
const asset = name => path.join(target, "assets", name);
const digest = value => createHash("sha256").update(value).digest("hex").slice(0, 10);
const fixtureText = fs.readFileSync(asset("kaki-demo-fixtures.js"), "utf8");
const fixtureName = `kaki-demo-fixtures-${digest(fixtureText)}.js`;
fs.renameSync(asset("kaki-demo-fixtures.js"), asset(fixtureName));
const clientText = fs.readFileSync(asset("kaki-demo-client.js"), "utf8").replace("./kaki-demo-fixtures.js", `./${fixtureName}`);
const clientName = `kaki-demo-client-${digest(clientText)}.js`;
fs.writeFileSync(asset(clientName), clientText);
fs.rmSync(asset("kaki-demo-client.js"));

for (const page of ["index.html", "desktop.html"]) {
  const filename = path.join(target, page);
  const html = fs.readFileSync(filename, "utf8");
  const entry = html.match(/<script type="module" crossorigin src="(\/assets\/[^"]+\.js)"><\/script>/);
  if (!entry) throw new Error(`Could not find Vite entry in ${page}`);
  fs.writeFileSync(filename, html.replace(entry[0], `<script type="module">import "/assets/${clientName}"; await import("${entry[1]}");</script>`));
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
