// Tiny zero-dependency static server for the production build (dist/).
// Any path that is not a real file falls back to index.html so that deep links
// such as /category/ইতিহাস or /2025/06/....kehem work on refresh.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('dist');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm',
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
    const sendPdf = (options) => {
      const stream = createReadStream(file, options);
      res.on('close', () => stream.destroy());
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    };
    const hashed = file.includes(`${join(ROOT, 'assets')}`);
    const headers = {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    // PDF.js uses byte ranges so large books can be read without downloading the whole file.
    if (extname(file).toLowerCase() === '.pdf') {
      const { size } = await stat(file);
      const range = req.headers.range;
      res.setHeader('Accept-Ranges', 'bytes');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        let start = match && match[1] ? Number(match[1]) : 0;
        let end = match && match[2] ? Number(match[2]) : size - 1;
        if (match && !match[1] && match[2]) { start = Math.max(0, size - Number(match[2])); end = size - 1; }
        if (!match || (!match[1] && !match[2]) || start >= size || start > end || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
          res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
          return;
        }
        end = Math.min(end, size - 1);
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
        if (req.method === 'HEAD') res.end(); else sendPdf({ start, end });
      } else {
        res.writeHead(200, { ...headers, 'Content-Length': size });
        if (req.method === 'HEAD') res.end(); else sendPdf();
      }
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`নিংশিং চে → http://localhost:${PORT}`));
