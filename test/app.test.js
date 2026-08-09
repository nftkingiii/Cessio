import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { CessioService } from '../src/service.js';
import { DeterministicUnderwriter } from '../src/underwriting.js';

class MemoryRepository {
  constructor() { this.state = { assessments: [], receivables: [], auditEvents: [] }; }
  async read() { return structuredClone(this.state); }
  async transact(mutator) { return mutator(this.state); }
}

async function withServer(config, callback) {
  const service = new CessioService({ repository: new MemoryRepository(), underwriter: new DeterministicUnderwriter(), clock: () => new Date('2026-08-10T00:00:00Z') });
  const server = createServer(createApp({ config, service }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const baseConfig = {
  allowedOrigins: ['http://localhost:5173'],
  underwritingProvider: 'deterministic',
  allowUnauthenticatedWrites: false
};

test('reports health and refuses writes while wallet authentication is pending', async () => {
  await withServer(baseConfig, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');

    const response = await fetch(`${baseUrl}/v1/underwriting/assessments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'AUTH_REQUIRED');
  });
});

test('runs the testnet development underwriting flow when explicitly enabled', async () => {
  await withServer({ ...baseConfig, allowUnauthenticatedWrites: true }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/underwriting/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originatorWallet: '0x1111111111111111111111111111111111111111',
        obligorName: 'Atlas Compute Ltd',
        invoiceReference: 'AC-2026-001',
        invoiceAmount: '1000.00',
        currency: 'USD',
        issuedDate: '2026-08-10',
        dueDate: '2026-08-30',
        serviceCategory: 'GPU compute',
        evidenceDigest: 'a'.repeat(64),
        deliveryConfidence: 0.96
      })
    });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).assessment.decision.decision, 'approved');
  });
});
