import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createTestnetReceiptReader } from './chain.js';
import { loadConfig } from './config.js';
import { FileRepository } from './repository.js';
import { CessioService } from './service.js';
import { createStaticHandler } from './static.js';
import { createUnderwriter } from './underwriting.js';

const config = loadConfig();
const projectRoot = join(fileURLToPath(new URL('..', import.meta.url)));
const repository = new FileRepository(join(projectRoot, 'data', 'cessio.json'));
const service = new CessioService({ repository, underwriter: createUnderwriter(config) });
const app = createApp({ config, service, chainReader: createTestnetReceiptReader() });
const serveStatic = createStaticHandler(join(projectRoot, 'public'));
const server = createServer(async (request, response) => {
  if (await serveStatic(request, response)) return;
  return app(request, response);
});

server.listen(config.port, () => {
  console.log(JSON.stringify({ event: 'server_started', port: config.port, provider: config.underwritingProvider }));
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
