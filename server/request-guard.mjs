// Explicitly limit the development file surface; Vite is not an auth boundary.
const sensitive = /(?:^|\/)(?:data|server|\.git|\.openai)(?:\/|$)|(?:^|\/)\.env[^/]*(?:\/|$)|\.(?:sqlite(?:3)?(?:-wal|-shm|-journal)?|db(?:-wal|-shm|-journal)?)(?:$|\/)/i;
const assetExtension = /\.(?:js|mjs|cjs|css|map|png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|otf|wasm)$/i;

export function inspectRequestTarget(target, { production = false } = {}) {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) return { allowed: false };
  let decoded = target.split('?')[0];
  try {
    for (let i = 0; i < 4; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch { return { allowed: false }; }
  if (decoded.includes('%') || /[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.split('/').some(segment => segment === '..' || segment === '.')) return { allowed: false };
  if (sensitive.test(decoded) || /^\/@fs(?:\/|$)/i.test(decoded) || decoded.includes(':')) return { allowed: false };
  if (decoded.startsWith('/api/')) return { allowed: true, api: true, pathname: decoded };
  if (['/', '/index.html', '/desktop.html'].includes(decoded)) return { allowed: true, pathname: decoded };
  if (decoded.startsWith('/assets/') && assetExtension.test(decoded)) return { allowed: true, pathname: decoded };
  if (!production) {
    if (['/@vite/client', '/@react-refresh'].includes(decoded)) return { allowed: true, pathname: decoded };
    if (decoded.startsWith('/src/') && /\.(?:tsx?|jsx?|css|svg)$/.test(decoded)) return { allowed: true, pathname: decoded };
    if (decoded.startsWith('/node_modules/') && assetExtension.test(decoded)) return { allowed: true, pathname: decoded };
  }
  return { allowed: false };
}

export function isLoopbackHost(host) { return ['127.0.0.1', 'localhost', '::1'].includes(host); }
