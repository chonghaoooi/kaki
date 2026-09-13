import { stat } from 'node:fs/promises';
import path from 'node:path';

export const isTextAsset = file => /\.(?:html|js|mjs|css|svg|json|txt|map)$/i.test(file);

export function encodingPreferences(header) {
  const values = new Map();
  for (const item of String(header || '').toLowerCase().split(',')) {
    const [name, ...parameters] = item.trim().split(';');
    if (!name) continue;
    const qualityParameter = parameters.map(x => x.trim()).find(x => x.startsWith('q='));
    const quality = qualityParameter === undefined ? 1 : Number(qualityParameter.slice(2));
    values.set(name, Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0);
  }
  const quality = encoding => values.has(encoding) ? values.get(encoding) : values.get('*') || 0;
  return ['br', 'gzip'].map((name, index) => ({ name, quality: quality(name), priority: index })).filter(x => x.quality > 0).sort((a, b) => b.quality - a.quality || a.priority - b.priority).map(x => x.name);
}

export async function encodedAsset(file, originalInfo, acceptEncoding) {
  if (isTextAsset(file)) for (const encoding of encodingPreferences(acceptEncoding)) {
    const candidate = file + (encoding === 'br' ? '.br' : '.gz');
    const info = await stat(candidate).catch(() => null);
    // A stale compressed sidecar must never shadow a newer source file.
    if (info?.isFile() && info.size < originalInfo.size && info.mtimeMs >= originalInfo.mtimeMs) return { file: candidate, info, encoding };
  }
  return { file, info: originalInfo, encoding: null };
}

export function assetCacheControl(file, base) {
  if (path.extname(file) === '.html') return 'no-cache';
  if (path.dirname(file) === path.join(base, 'assets') && /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/i.test(path.basename(file))) return 'public, max-age=31536000, immutable';
  return 'public, max-age=86400';
}
