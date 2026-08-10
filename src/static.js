import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/brand/cessio-logo.png', ['brand/cessio-logo.png', 'image/png']],
  ['/brand/cessio-banner.png', ['brand/cessio-banner.png', 'image/png']]
]);

export function createStaticHandler(publicDirectory) {
  return async function serveStatic(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return false;
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const asset = assets.get(pathname);
    if (!asset) return false;
    const [fileName, contentType] = asset;
    const content = await readFile(join(publicDirectory, fileName));
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Security-Policy': "default-src 'self'; img-src 'self' https://images.unsplash.com; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; script-src 'self' https://unpkg.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store'
    });
    if (request.method === 'GET') response.end(content);
    else response.end();
    return true;
  };
}
