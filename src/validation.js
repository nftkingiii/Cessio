const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const hashPattern = /^0x[a-fA-F0-9]{64}$/;
const sha256Pattern = /^[a-fA-F0-9]{64}$/;

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${name} must be an object`);
  }
  return value;
}

function text(value, name, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string') throw new ValidationError(`${name} must be a string`);
  const result = value.trim();
  if (result.length < min || result.length > max) {
    throw new ValidationError(`${name} must be between ${min} and ${max} characters`);
  }
  return result;
}

function amount(value, name) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(`${name} must be a decimal amount`);
  }
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new ValidationError(`${name} must be a positive decimal with at most 6 places`);
  }
  return normalized;
}

function isoDate(value, name) {
  const normalized = text(value, name, { min: 10, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new ValidationError(`${name} must be YYYY-MM-DD`);
  }
  return normalized;
}

export function parseAssessmentRequest(input) {
  const body = object(input, 'body');
  const dueDate = isoDate(body.dueDate, 'dueDate');
  const issuedDate = isoDate(body.issuedDate, 'issuedDate');
  if (Date.parse(`${dueDate}T00:00:00Z`) <= Date.parse(`${issuedDate}T00:00:00Z`)) {
    throw new ValidationError('dueDate must be after issuedDate');
  }

  return {
    originatorWallet: parseWallet(body.originatorWallet, 'originatorWallet'),
    obligorName: text(body.obligorName, 'obligorName', { max: 120 }),
    invoiceReference: text(body.invoiceReference, 'invoiceReference', { max: 80 }),
    invoiceAmount: amount(body.invoiceAmount, 'invoiceAmount'),
    currency: text(body.currency, 'currency', { min: 3, max: 3 }).toUpperCase(),
    issuedDate,
    dueDate,
    serviceCategory: text(body.serviceCategory, 'serviceCategory', { max: 80 }),
    evidenceDigest: parseEvidenceDigest(body.evidenceDigest),
    deliveryConfidence: parseConfidence(body.deliveryConfidence)
  };
}

export function parseDemoInvoiceRequest(input) {
  return parseAssessmentRequest(input);
}

export function parseReceivableRequest(input) {
  const body = object(input, 'body');
  return {
    assessmentId: text(body.assessmentId, 'assessmentId', { max: 80 }),
    originatorWallet: parseWallet(body.originatorWallet, 'originatorWallet'),
    settlementToken: parseWallet(body.settlementToken, 'settlementToken'),
    chainId: parseChainId(body.chainId),
    requestedFundingAmount: amount(body.requestedFundingAmount, 'requestedFundingAmount')
  };
}

export function parseChainEventRequest(input) {
  const body = object(input, 'body');
  const type = text(body.type, 'type', { max: 40 });
  const allowedTypes = new Set(['receivable_registered', 'funding_opened', 'funded', 'repaid', 'distribution_claimed']);
  if (!allowedTypes.has(type)) throw new ValidationError('type is not supported');
  const txHash = text(body.txHash, 'txHash', { min: 66, max: 66 });
  if (!hashPattern.test(txHash)) throw new ValidationError('txHash must be a transaction hash');
  return { type, txHash, chainId: parseChainId(body.chainId), contractAddress: parseWallet(body.contractAddress, 'contractAddress') };
}

function parseWallet(value, name) {
  const result = text(value, name, { min: 42, max: 42 });
  if (!addressPattern.test(result)) throw new ValidationError(`${name} must be an EVM address`);
  return result.toLowerCase();
}

function parseEvidenceDigest(value) {
  const result = text(value, 'evidenceDigest', { min: 64, max: 64 });
  if (!sha256Pattern.test(result)) throw new ValidationError('evidenceDigest must be a SHA-256 hex digest');
  return result.toLowerCase();
}

function parseConfidence(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ValidationError('deliveryConfidence must be a number between 0 and 1');
  }
  return value;
}

function parseChainId(value) {
  const chainId = Number(value);
  if (chainId !== 968 && chainId !== 677) {
    throw new ValidationError('chainId must be BOT Chain Testnet (968) or Mainnet (677)');
  }
  return chainId;
}
