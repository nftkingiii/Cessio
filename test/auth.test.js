import assert from 'node:assert/strict';
import test from 'node:test';
import { Wallet } from 'ethers';
import { WalletAuth } from '../src/auth.js';

test('verifies a wallet nonce and returns a short-lived session', async () => {
  const wallet = Wallet.createRandom();
  const auth = new WalletAuth();
  const nonce = auth.issueNonce(wallet.address);
  const message = `Cessio sign-in\nNonce: ${nonce}`;
  const signature = await wallet.signMessage(message);
  const session = auth.verify(wallet.address, message, signature);
  assert.equal(session.address, wallet.address.toLowerCase());
  assert.equal(auth.session(session.token), wallet.address.toLowerCase());
});

test('rejects a wallet signature from the wrong address', async () => {
  const wallet = Wallet.createRandom();
  const other = Wallet.createRandom();
  const auth = new WalletAuth();
  const nonce = auth.issueNonce(wallet.address);
  const message = `Cessio sign-in\nNonce: ${nonce}`;
  const signature = await other.signMessage(message);
  assert.throws(() => auth.verify(wallet.address, message, signature), /does not match/);
});
