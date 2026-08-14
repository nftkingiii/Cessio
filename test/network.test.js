import assert from 'node:assert/strict';
import test from 'node:test';
import { loadNetworkConfig } from '../src/network.js';

test('defaults Cessio to BOT Chain Testnet', () => {
  const network = loadNetworkConfig({});
  assert.equal(network.key, 'testnet');
  assert.equal(network.chainId, 968);
});

test('refuses incomplete mainnet configuration', () => {
  assert.throws(() => loadNetworkConfig({ CESSIO_NETWORK: 'mainnet' }), /Mainnet configuration is incomplete/);
});

test('loads a complete mainnet configuration', () => {
  const network = loadNetworkConfig({
    CESSIO_NETWORK: 'mainnet',
    BOT_MAINNET_RPC: 'https://rpc.example.org',
    CESSIO_RECEIVABLES_ADDRESS: '0x1111111111111111111111111111111111111111',
    CESSIO_SETTLEMENT_TOKEN_ADDRESS: '0x2222222222222222222222222222222222222222'
  });
  assert.equal(network.key, 'mainnet');
  assert.equal(network.chainId, 677);
  assert.equal(network.settlementTokenSymbol, 'USDT');
});
