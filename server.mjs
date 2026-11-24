// Tiny zero-dependency static server for the production build (dist/).
// Any path that is not a real file falls back to index.html so that deep links
// such as /category/ইতিহাস or /2025/06/....kehem work on refresh.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('dist');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  let pathname = '/';
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname); } catch { /* bad URI → index */ }
  let file = normalize(join(ROOT, pathname));
  if (!file.startsWith(ROOT)) file = join(ROOT, 'index.html');
  let isFile = false;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
    isFile = (await stat(file)).isFile();
  } catch { /* not found */ }
  if (!isFile) file = join(ROOT, 'index.html'); // SPA fallback
  try {
    const body = await readFile(file);
    const hashed = file.includes(`${join(ROOT, 'assets')}`);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`নিংশিং চে → http://localhost:${PORT}`));
