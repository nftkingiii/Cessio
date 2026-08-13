import { verifyMessage } from 'ethers';
import { randomBytes } from 'node:crypto';

const NONCE_TTL_MS = 10 * 60 * 1000;

export class WalletAuth {
  constructor() {
    this.nonces = new Map();
    this.sessions = new Map();
  }

  issueNonce(address) {
    const normalized = address.toLowerCase();
    const nonce = randomBytes(24).toString('hex');
    this.nonces.set(normalized, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
    return nonce;
  }

  verify(address, message, signature) {
    const normalized = address.toLowerCase();
    const entry = this.nonces.get(normalized);
    if (!entry || entry.expiresAt < Date.now()) throw new Error('Wallet nonce is missing or expired');
    if (!message.includes(entry.nonce)) throw new Error('Wallet message does not contain the issued nonce');
    const recovered = verifyMessage(message, signature).toLowerCase();
    if (recovered !== normalized) throw new Error('Wallet signature does not match the address');
    this.nonces.delete(normalized);
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, { address: normalized, expiresAt: Date.now() + NONCE_TTL_MS });
    return { address: normalized, token };
  }

  session(token) {
    const entry = this.sessions.get(token);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.address;
  }
}

export function authAddress(request, walletAuth) {
  const token = request.headers['x-cessio-token'];
  return typeof token === 'string' ? walletAuth.session(token) : null;
}
