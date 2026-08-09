import assert from 'node:assert/strict';
import test from 'node:test';
import { CessioService } from '../src/service.js';
import { DeterministicUnderwriter } from '../src/underwriting.js';

class MemoryRepository {
  constructor() { this.state = { assessments: [], receivables: [], auditEvents: [] }; }
  async read() { return structuredClone(this.state); }
  async transact(mutator) { return mutator(this.state); }
}

const invoice = {
  originatorWallet: '0x1111111111111111111111111111111111111111', obligorName: 'Atlas Compute Ltd', invoiceReference: 'AC-2026-001', invoiceAmount: '1000.00', currency: 'USD', issuedDate: '2026-08-10', dueDate: '2026-08-30', serviceCategory: 'GPU compute', evidenceDigest: 'a'.repeat(64), deliveryConfidence: 0.96
};

test('creates an approved receivable and omits its evidence digest from read responses', async () => {
  const service = new CessioService({ repository: new MemoryRepository(), underwriter: new DeterministicUnderwriter(), clock: () => new Date('2026-08-10T00:00:00Z') });
  const assessment = await service.createAssessment(invoice);
  const receivable = await service.createReceivable({ assessmentId: assessment.id, originatorWallet: invoice.originatorWallet, settlementToken: '0x2222222222222222222222222222222222222222', chainId: 968, requestedFundingAmount: '500.00' });
  assert.equal(receivable.status, 'approved');
  const readBack = await service.getReceivable(receivable.id);
  assert.equal(readBack.invoice.evidenceDigest, undefined);
  assert.equal(readBack.auditEvents.length, 1);
});
