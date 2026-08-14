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

async function withServer(config, callback, chainReader) {
  const service = new CessioService({ repository: new MemoryRepository(), underwriter: new DeterministicUnderwriter(), clock: () => new Date('2026-08-10T00:00:00Z') });
  const server = createServer(createApp({ config, service, chainReader }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const baseConfig = {
  allowedOrigins: ['http://localhost:5173', 'https://cessio.up.railway.app'],
  underwritingProvider: 'deterministic',
  allowUnauthenticatedWrites: false,
  network: { key: 'testnet', chainId: 968, chainIdHex: '0x3c8', chainName: 'BOT Chain Testnet', rpcUrl: 'https://rpc.bohr.life', explorerUrl: 'https://scan.bohr.life', receivablesAddress: '0x212d99C7fC7C83901e8d6BB0F82d937F9735d248', settlementTokenAddress: '0x4D0984B958b4376dE072DC098404c4afA9155C90', settlementTokenSymbol: 'cUSDT', nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 }, bdex: { router: '0xD6425a02f0845B8D99e349C34D2E7A576E177345', wbot: '0xD5452816194a3784dBa983426cCe7c122F4abd30', usdt: '0x75edC9335175Fc0552D51D48439F229c10420fe3' } }
};

test('reports health and refuses writes while wallet authentication is pending', async () => {
  await withServer(baseConfig, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    const healthPayload = await health.json();
    assert.equal(healthPayload.status, 'ok');
    assert.equal(healthPayload.network, 'testnet');

    const network = await fetch(`${baseUrl}/v1/network`);
    assert.equal(network.status, 200);
    assert.equal((await network.json()).network.receivablesAddress, baseConfig.network.receivablesAddress);

    const response = await fetch(`${baseUrl}/v1/underwriting/assessments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'AUTH_REQUIRED');
  });
});

test('returns a normalized Testnet receipt through the same-origin API', async () => {
  const chainReader = { getReceipt: async (id) => ({ id, status: 3, principal: '100000000', repayment: '105000000', totalFunded: '100000000' }) };
  await withServer(baseConfig, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/chain/receipts/1`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { receipt: { id: 1, status: 3, principal: '100000000', repayment: '105000000', totalFunded: '100000000' } });
  }, chainReader);
});

test('runs the testnet development underwriting flow when explicitly enabled', async () => {
  await withServer({ ...baseConfig, allowUnauthenticatedWrites: true, demoMode: true }, async (baseUrl) => {
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

test('creates an approved Testnet demo receivable without enabling general writes', async () => {
  await withServer({ ...baseConfig, demoMode: true }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/demo/receivables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originatorWallet: '0x1111111111111111111111111111111111111111',
        obligorName: 'Demo Compute Ltd',
        invoiceReference: 'DEMO-2026-001',
        invoiceAmount: '1000.00',
        currency: 'USD',
        issuedDate: '2026-08-10',
        dueDate: '2026-08-30',
        serviceCategory: 'GPU compute',
        evidenceDigest: 'b'.repeat(64),
        deliveryConfidence: 0.96
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.assessment.decision.decision, 'approved');
    assert.equal(payload.receivable.chainId, 968);
  });
});

test('allows the production Cessio origin for browser writes', async () => {
  await withServer({ ...baseConfig, demoMode: true }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/demo/receivables`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://cessio.up.railway.app',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://cessio.up.railway.app');
  });
});

test('enriches persisted receivables with live chain funding state', async () => {
  await withServer({ ...baseConfig, allowUnauthenticatedWrites: true, demoMode: true }, async (baseUrl) => {
    const create = await fetch(`${baseUrl}/v1/demo/receivables`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originatorWallet: '0x1111111111111111111111111111111111111111', obligorName: 'Chain Compute', invoiceReference: 'CHAIN-1', invoiceAmount: '1000', currency: 'USD', issuedDate: '2026-08-10', dueDate: '2026-08-30', serviceCategory: 'GPU compute', evidenceDigest: 'c'.repeat(64), deliveryConfidence: 0.96
      })
    });
    const payload = await create.json();
    const event = await fetch(`${baseUrl}/v1/receivables/${payload.receivable.id}/chain-events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'receivable_registered', txHash: `0x${'d'.repeat(64)}`, chainId: 968, contractAddress: '0x2222222222222222222222222222222222222222', chainReceiptId: 5 })
    });
    assert.equal(event.status, 201);
    const list = await fetch(`${baseUrl}/v1/receivables`);
    const listed = (await list.json()).receivables[0];
    assert.equal(listed.chainState.totalFunded, '5000000');
    assert.equal(listed.chainState.principal, '795000000');
  }, { getReceipt: async () => ({ id: 5, principal: '795000000', repayment: '834750000', status: 1, totalFunded: '5000000' }) });
});
