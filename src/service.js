import { randomUUID } from 'node:crypto';

export class CessioService {
  constructor({ repository, underwriter, network = { chainId: 968, settlementTokenAddress: '0x4D0984B958b4376dE072DC098404c4afA9155C90' }, clock = () => new Date() }) {
    this.repository = repository;
    this.underwriter = underwriter;
    this.network = network;
    this.clock = clock;
  }

  async createAssessment(invoice) {
    const decision = await this.underwriter.assess(invoice, this.clock());
    if (decision.maxFundingAmount === null) {
      decision.maxFundingAmount = (Number(invoice.invoiceAmount) * decision.advanceRateBps / 10_000).toFixed(6);
    }
    const assessment = {
      id: `asm_${randomUUID()}`,
      createdAt: this.clock().toISOString(),
      invoice,
      decision
    };
    await this.repository.transact((state) => {
      state.assessments.push(assessment);
      state.auditEvents.push(audit('assessment_created', assessment.id, { decision: decision.decision, provider: decision.provider }, this.clock));
    });
    return assessment;
  }

  async createDemoReceivable(invoice) {
    const assessment = await this.createAssessment(invoice);
    if (assessment.decision.decision !== 'approved') return { assessment, receivable: null };
    const requestedFundingAmount = Math.min(Number(invoice.invoiceAmount), Number(assessment.decision.maxFundingAmount)).toFixed(6);
    const receivable = await this.createReceivable({
      assessmentId: assessment.id,
      originatorWallet: invoice.originatorWallet,
      settlementToken: this.network.settlementTokenAddress,
      chainId: this.network.chainId,
      requestedFundingAmount
    });
    return { assessment, receivable };
  }

  async createReceivable(input) {
    return this.repository.transact((state) => {
      const assessment = state.assessments.find((entry) => entry.id === input.assessmentId);
      if (!assessment) return notFound('Underwriting assessment not found');
      if (assessment.invoice.originatorWallet !== input.originatorWallet) return forbidden('Originator wallet does not match the assessment');
      if (assessment.decision.decision !== 'approved') return conflict('Only approved assessments can create receivables');
      if (Number(input.requestedFundingAmount) > Number(assessment.decision.maxFundingAmount)) return conflict('requestedFundingAmount exceeds approved limit');

      const receivable = {
        id: `rcv_${randomUUID()}`,
        createdAt: this.clock().toISOString(),
        status: 'approved',
        assessmentId: assessment.id,
        originatorWallet: input.originatorWallet,
        settlementToken: input.settlementToken,
        chainId: input.chainId,
        requestedFundingAmount: input.requestedFundingAmount,
        invoice: publicInvoice(assessment.invoice),
        underwriting: assessment.decision,
        chainEvents: []
      };
      state.receivables.push(receivable);
      state.auditEvents.push(audit('receivable_created', receivable.id, { assessmentId: assessment.id, chainId: input.chainId }, this.clock));
      return receivable;
    });
  }

  async listReceivables() {
    const state = await this.repository.read();
    return state.receivables
      .filter((receivable) => receivable.chainId === this.network.chainId)
      .filter((receivable) => receivable.settlementToken?.toLowerCase() === this.network.settlementTokenAddress?.toLowerCase())
      .filter((receivable) => receivable.chainEvents?.some((event) => event.type === 'receivable_registered'))
      .map(publicReceivable);
  }

  async getReceivable(id) {
    const state = await this.repository.read();
    const receivable = state.receivables.find((entry) => entry.id === id);
    if (!receivable) return notFound('Receivable not found');
    const auditEvents = state.auditEvents.filter((event) => event.subjectId === id);
    return { ...publicReceivable(receivable), auditEvents };
  }

  async addChainEvent(id, event) {
    return this.repository.transact((state) => {
      const receivable = state.receivables.find((entry) => entry.id === id);
      if (!receivable) return notFound('Receivable not found');
      if (receivable.chainId !== event.chainId) return conflict('chainId does not match the receivable');
      if (receivable.chainEvents.some((entry) => entry.txHash === event.txHash)) return conflict('Transaction hash already recorded');
      const recordedEvent = { id: `evt_${randomUUID()}`, recordedAt: this.clock().toISOString(), ...event };
      receivable.chainEvents.push(recordedEvent);
      state.auditEvents.push(audit('chain_event_recorded', id, { type: event.type, txHash: event.txHash }, this.clock));
      return recordedEvent;
    });
  }
}

function audit(type, subjectId, details, clock) {
  return { id: `aud_${randomUUID()}`, at: clock().toISOString(), type, subjectId, details };
}

function publicInvoice(invoice) {
  const { evidenceDigest, ...publicFields } = invoice;
  return publicFields;
}

function publicReceivable(receivable) {
  return { ...receivable, invoice: publicInvoice(receivable.invoice) };
}

function domainError(statusCode, message) {
  return { error: { statusCode, message } };
}
const notFound = (message) => domainError(404, message);
const forbidden = (message) => domainError(403, message);
const conflict = (message) => domainError(409, message);
export const isDomainError = (value) => Boolean(value?.error?.statusCode);
