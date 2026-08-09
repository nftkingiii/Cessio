import assert from 'node:assert/strict';
import test from 'node:test';
import { DeterministicUnderwriter } from '../src/underwriting.js';

const invoice = {
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
};

test('approves a short-term invoice with strong delivery evidence', async () => {
  const result = await new DeterministicUnderwriter().assess(invoice, new Date('2026-08-10T00:00:00Z'));
  assert.equal(result.decision, 'approved');
  assert.ok(Number(result.maxFundingAmount) > 0);
  assert.ok(result.advanceRateBps > 0);
});

test('rejects an invoice with weak evidence close to due date', async () => {
  const result = await new DeterministicUnderwriter().assess({ ...invoice, dueDate: '2026-08-14', deliveryConfidence: 0.2 }, new Date('2026-08-10T00:00:00Z'));
  assert.equal(result.decision, 'rejected');
  assert.equal(result.maxFundingAmount, '0.000000');
});
