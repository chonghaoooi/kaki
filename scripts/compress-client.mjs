import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { brotliCompress, gzip, constants } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'client');
const br = promisify(brotliCompress);
const gz = promisify(gzip);
const compressible = /\.(?:html|js|mjs|css|svg|json|txt|map)$/i;
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(full);
    else if (entry.isFile() && compressible.test(entry.name)) files.push(full);
  }
}
await collect(root);
let count = 0, originalBytes = 0, brotliBytes = 0, gzipBytes = 0;
// Keep compression concurrency bounded to avoid large build-time memory spikes.
let next = 0;
async function worker() {
  while (next < files.length) {
    const file = files[next++], input = await readFile(file);
    if (input.length < 512) {
      await Promise.all(['br', 'gz'].map(extension => rm(file + '.' + extension, { force: true })));
      continue;
    }
    const [brotli, zipped] = await Promise.all([
      br(input, { params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT } }),
      gz(input, { level: 9 }),
    ]);
    for (const [extension, output] of [['br', brotli], ['gz', zipped]]) {
      if (output.length < input.length) await writeFile(file + '.' + extension, output);
      else await rm(file + '.' + extension, { force: true });
    }
    count++; originalBytes += input.length; brotliBytes += Math.min(input.length, brotli.length); gzipBytes += Math.min(input.length, zipped.length);
  }
}
await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));
console.log(`Precompressed ${count} text assets: ${(originalBytes / 1024).toFixed(0)} KiB → Brotli ${(brotliBytes / 1024).toFixed(0)} KiB / gzip ${(gzipBytes / 1024).toFixed(0)} KiB.`);
