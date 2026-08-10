import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createApp } from '../src/app.js';
import { FileRepository } from '../src/repository.js';
import { CessioService } from '../src/service.js';
import { createStaticHandler } from '../src/static.js';
import { DeterministicUnderwriter } from '../src/underwriting.js';

const run = promisify(execFile);
const projectRoot = join(fileURLToPath(new URL('..', import.meta.url)));
const output = process.env.CESSIO_SCREENSHOT_PATH ?? join(process.env.TEMP ?? projectRoot, 'cessio-market.png');
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const viewport = process.env.CESSIO_VIEWPORT ?? '1440,1100';
const profileDirectory = join(process.env.TEMP ?? projectRoot, `cessio-edge-profile-${viewport.replace(',', 'x')}`);
const config = { allowedOrigins: ['http://localhost:5173'], underwritingProvider: 'deterministic', allowUnauthenticatedWrites: false };
const repository = new FileRepository(join(projectRoot, 'data', 'cessio-visual.json'));
const service = new CessioService({ repository, underwriter: new DeterministicUnderwriter() });
const app = createApp({ config, service });
const serveStatic = createStaticHandler(join(projectRoot, 'public'));
const server = createServer(async (request, response) => {
  if (await serveStatic(request, response)) return;
  return app(request, response);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
await mkdir(profileDirectory, { recursive: true });

try {
  await run(edge, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--force-device-scale-factor=1', `--user-data-dir=${profileDirectory}`,
    `--window-size=${viewport}`, '--run-all-compositor-stages-before-draw', '--virtual-time-budget=1600',
    `--screenshot=${output}`, `http://127.0.0.1:${port}/`
  ], { timeout: 30_000 });
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

await access(output);
console.log(output);
