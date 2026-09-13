import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, stat } from 'node:fs/promises';
import { inspectRequestTarget } from './request-guard.mjs';
import { encodingPreferences } from './static-assets.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const hiddenPaths = [
  '/data/kaki.sqlite', '/data/kaki.sqlite-wal', '/data/kaki.sqlite-shm', '/data/kaki.db',
  '/server/api.mjs', '/server/start.mjs', '/.env', '/.env.local', '/.git/config', '/.openai/hosting.json',
  '/@fs/C:/Users/example/data/kaki.sqlite', '/%40fs/C%3A/Users/example/server/api.mjs',
  '/%2540fs/C%253A/Users/example/.env', '/data%2fkaki.sqlite', '/data%252fkaki.sqlite-wal',
  '/src/%2e%2e/data/kaki.sqlite', '/src%5c..%5cdata%5ckaki.sqlite', '/assets/private.db',
  '/node_modules/../../server/api.mjs', '/@id/C:/Users/example/.env', '/package.json',
];

async function runner(t, production = false) {
  const folder = mkdtempSync(join(tmpdir(), 'kaki-runner-'));
  const child = spawn(process.execPath, ['server/start.mjs', '--port', '0', ...(production ? ['--production'] : [])], { cwd: project, env: { ...process.env, KAKI_DB_PATH: join(folder, 'test.sqlite'), KAKI_DEMO_MODE: 'true', KAKI_ORIGIN: '' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Runner startup timed out: ' + output)); }, 20000);
    child.stdout.on('data', buffer => { output += String(buffer); const match = /http:\/\/127\.0\.0\.1:(\d+)\/desktop/.exec(output); if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); } });
    child.stderr.on('data', buffer => { output += String(buffer); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); if (!/kaki is ready/.test(output)) reject(new Error(`Runner exited ${code}: ${output}`)); });
  });
  t.after(async () => { const exited = once(child, 'exit'); child.kill(); await exited; rmSync(folder, { recursive: true, force: true }); });
  return base;
}

test('request guard rejects direct, encoded and Vite filesystem secrets', () => {
  for (const production of [false, true]) for (const path of hiddenPaths) assert.equal(inspectRequestTarget(path, { production }).allowed, false, path);
  for (const path of ['/', '/desktop.html', '/assets/kaki/games.webp', '/api/state']) assert.equal(inspectRequestTarget(path).allowed, true, path);
  assert.equal(inspectRequestTarget('/src/Prototype.tsx').allowed, true);
  assert.equal(inspectRequestTarget('/src/Prototype.tsx', { production: true }).allowed, false);
});

for (const production of [false, true]) test(`${production ? 'production' : 'development'} runner denies secret files over actual HTTP`, async t => {
  const base = await runner(t, production);
  for (const path of hiddenPaths) {
    const response = await fetch(base + path);
    assert.equal(response.status, 403, path);
    assert.equal(await response.text(), 'Forbidden', path);
  }
  assert.equal((await fetch(base + '/api/health')).status, 200);
  if (!production) {
    assert.equal((await fetch(base + '/')).status, 200);
    assert.equal((await fetch(base + '/@vite/client')).status, 200);
    assert.equal((await fetch(base + '/src/Prototype.tsx')).status, 200);
  }
});

test('demo refuses public binding and live mode requires explicit configuration', async () => {
  for (const { args, env, expected } of [
    { args: ['--host', '0.0.0.0'], env: { KAKI_DEMO_MODE: 'true' }, expected: /loopback host/ },
    { args: [], env: { KAKI_DEMO_MODE: 'false', PORT: '', KAKI_ORIGIN: '' }, expected: /explicit --port or PORT/ },
    { args: ['--port', '49999'], env: { KAKI_DEMO_MODE: 'false', KAKI_ORIGIN: '' }, expected: /canonical KAKI_ORIGIN/ },
  ]) {
    const child = spawn(process.execPath, ['server/start.mjs', ...args], { cwd: project, env: { ...process.env, ...env }, windowsHide: true });
    let output = ''; child.stderr.on('data', b => { output += b; }); const [code] = await once(child, 'exit'); assert.notEqual(code, 0); assert.match(output, expected);
  }
});

test('encoding preference respects quality and explicit exclusions', () => {
  assert.deepEqual(encodingPreferences('gzip, br'), ['br', 'gzip']);
  assert.deepEqual(encodingPreferences('br;q=0.2, gzip;q=1'), ['gzip', 'br']);
  assert.deepEqual(encodingPreferences('gzip;q=0, br;q=0'), []);
  assert.deepEqual(encodingPreferences('*;q=1, br;q=0'), ['gzip']);
  assert.deepEqual(encodingPreferences(''), []);
});

test('built production text serves Brotli/gzip with correct caching and bodyless HEAD', async t => {
  const assets = join(project, 'dist/client/assets');
  const names = await readdir(assets).catch(() => []);
  const name = names.find(value => /-[\w-]{8}\.css$/.test(value) && names.includes(value + '.br') && names.includes(value + '.gz'));
  if (!name) { t.skip('Run npm run build first to generate precompressed client assets.'); return; }
  const original = await readFile(join(assets, name), 'utf8');
  const base = await runner(t, true), url = base + '/assets/' + name;
  const br = await fetch(url, { headers: { 'Accept-Encoding': 'gzip, br' } });
  assert.equal(br.status, 200); assert.equal(br.headers.get('content-encoding'), 'br'); assert.equal(br.headers.get('vary'), 'Accept-Encoding'); assert.match(br.headers.get('content-type'), /text\/css/); assert.match(br.headers.get('cache-control'), /immutable/); assert.equal(await br.text(), original);
  const head = await fetch(url, { method: 'HEAD', headers: { 'Accept-Encoding': 'br' } }); assert.equal(head.status, 200); assert.equal(head.headers.get('content-encoding'), 'br'); assert.equal(Number(head.headers.get('content-length')), (await stat(join(assets, name + '.br'))).size); assert.equal((await head.arrayBuffer()).byteLength, 0);
  const gz = await fetch(url, { headers: { 'Accept-Encoding': 'br;q=0.2, gzip;q=1' } }); assert.equal(gz.headers.get('content-encoding'), 'gzip'); assert.equal(await gz.text(), original);
  const identity = await fetch(url, { headers: { 'Accept-Encoding': 'br;q=0, gzip;q=0' } }); assert.equal(identity.headers.get('content-encoding'), null); assert.equal(await identity.text(), original);
  const html = await fetch(base + '/desktop.html', { method: 'HEAD' }); assert.equal(html.status, 200); assert.equal(html.headers.get('cache-control'), 'no-cache'); assert.equal((await html.arrayBuffer()).byteLength, 0);
  const image = await fetch(base + '/assets/kaki/games.webp', { method: 'HEAD' }); assert.equal(image.status, 200); assert.equal(image.headers.get('cache-control'), 'public, max-age=86400'); assert.equal(image.headers.get('content-encoding'), null);
});
