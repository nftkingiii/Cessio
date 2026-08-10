import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createStaticHandler } from '../src/static.js';

const projectRoot = join(fileURLToPath(new URL('..', import.meta.url)));

async function withStaticServer(callback) {
  const server = createServer(createStaticHandler(join(projectRoot, 'public')));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('serves the Cessio marketplace shell and its static assets', async () => {
  await withStaticServer(async (baseUrl) => {
    const page = await fetch(`${baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Capital, backed/);
    assert.match(page.headers.get('content-security-policy'), /images.unsplash.com/);
    assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);

    const stylesheet = await fetch(`${baseUrl}/styles.css`);
    assert.equal(stylesheet.status, 200);
    assert.match(stylesheet.headers.get('content-type'), /text\/css/);

    const logo = await fetch(`${baseUrl}/brand/cessio-logo.png`);
    assert.equal(logo.status, 200);
    assert.match(logo.headers.get('content-type'), /image\/png/);
  });
});
