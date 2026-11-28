// Validate crawler-facing HTML produced by `npm run build`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (path === join('dist', 'dashboard')) return []; // Private administration is intentionally noindex.
    return entry.isDirectory() ? walk(path) : entry.name === 'index.html' ? [path] : [];
  });
}
const files = walk('dist');
assert(files.length > 10, 'Expected generated share pages');
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  for (const [attr, key] of [['name','description'], ['property','og:title'], ['property','og:description'], ['property','og:type'], ['property','og:url'], ['property','og:image'], ['name','twitter:card'], ['name','twitter:title'], ['name','twitter:description'], ['name','twitter:image']]) {
    const matches = [...html.matchAll(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]+)"\\s*/?>`, 'gi'))];
    assert.equal(matches.length, 1, `${file}: expected exactly one ${key}`);
  }
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  const ogUrl = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i)?.[1];
  assert(canonical && canonical === ogUrl, `${file}: canonical and OG URL differ`);
}
for (const path of ['login', 'register', 'profile', 'search']) assert.match(readFileSync(`dist/${path}/index.html`, 'utf8'), /<meta name="robots" content="noindex, nofollow"/);
console.log(`PASS: metadata and canonical tags in ${files.length} generated pages; private routes are noindex.`);
