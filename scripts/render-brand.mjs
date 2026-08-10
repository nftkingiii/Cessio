import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = join(root, 'public', 'brand');
const backdrop = await readFile(join(outputDirectory, 'cessio-banner-background.png'));
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const mark = `
  <svg viewBox="0 0 512 512" aria-label="Cessio logo mark" role="img">
    <path fill="#9bed63" d="M84 84h260v88H172v168H84V84Z"/>
    <path fill="#9bed63" d="M428 428H168v-88h172V172h88v256Z"/>
  </svg>`;

const logoPage = `<!doctype html><html><head><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#101211}body{display:grid;place-items:center}.mark{width:68%;height:68%}.mark svg{width:100%;height:100%;display:block}
</style></head><body><div class="mark">${mark}</div></body></html>`;

const bannerPage = `<!doctype html><html><head><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101211}body{font-family:Arial,sans-serif}.banner{width:100vw;height:100vh;position:relative;background:linear-gradient(90deg,rgba(16,18,17,.12),rgba(16,18,17,.02)),url('/backdrop') center/cover no-repeat}.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,14,13,.72) 0%,rgba(12,14,13,.34) 38%,rgba(12,14,13,.08) 66%,rgba(12,14,13,.2) 100%)}.wordmark{position:absolute;left:10.5%;top:42%;display:flex;align-items:center;color:#f3f6f1;font-size:112px;font-weight:700;letter-spacing:-7px;line-height:1}.wordmark .mark{width:104px;height:104px;margin-right:14px}.wordmark .mark svg{display:block;width:100%;height:100%}.rule{position:absolute;left:10.8%;top:57%;width:365px;height:2px;background:#9bed63}.meta{position:absolute;left:10.8%;top:61%;font:17px monospace;color:#c7cec7;letter-spacing:2px;text-transform:uppercase}.index{position:absolute;right:9%;bottom:10%;font:16px monospace;color:#9bed63;letter-spacing:2px}
</style></head><body><main class="banner"><div class="shade"></div><div class="wordmark"><span class="mark">${mark}</span><span>essio</span></div><div class="rule"></div><div class="meta">Capital, backed by proof.</div><div class="index">TESTNET / 968</div></main></body></html>`;

const server = createServer((request, response) => {
  if (request.url === '/backdrop') return response.writeHead(200, { 'Content-Type': 'image/png' }).end(backdrop);
  const page = request.url === '/logo' ? logoPage : bannerPage;
  return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(page);
});

await mkdir(outputDirectory, { recursive: true });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const profile = join(process.env.TEMP ?? root, 'cessio-brand-render');

try {
  await run(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--force-device-scale-factor=1', `--user-data-dir=${profile}`, '--window-size=1024,1024', '--screenshot=' + join(outputDirectory, 'cessio-logo.png'), `http://127.0.0.1:${port}/logo`], { timeout: 30_000 });
  await run(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--force-device-scale-factor=1', `--user-data-dir=${profile}`, '--window-size=1920,1080', '--screenshot=' + join(outputDirectory, 'cessio-banner.png'), `http://127.0.0.1:${port}/banner`], { timeout: 30_000 });
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
