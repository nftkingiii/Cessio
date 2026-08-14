const TESTNET = Object.freeze({
  key: 'testnet',
  chainId: 968,
  chainIdHex: '0x3c8',
  chainName: 'BOT Chain Testnet',
  rpcUrl: 'https://rpc.bohr.life',
  explorerUrl: 'https://scan.bohr.life',
  receivablesAddress: '0x212d99C7fC7C83901e8d6BB0F82d937F9735d248',
  settlementTokenAddress: '0x4D0984B958b4376dE072DC098404c4afA9155C90',
  settlementTokenSymbol: 'cUSDT',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  bdex: {
    router: '0xD6425a02f0845B8D99e349C34D2E7A576E177345',
    wbot: '0xD5452816194a3784dBa983426cCe7c122F4abd30',
    usdt: '0x75edC9335175Fc0552D51D48439F229c10420fe3'
  }
});

const MAINNET_DEFAULTS = Object.freeze({
  key: 'mainnet',
  chainId: 677,
  chainIdHex: '0x2a5',
  chainName: 'BOT Chain Mainnet',
  explorerUrl: 'https://scan.botchain.ai',
  settlementTokenSymbol: 'USDT',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  bdex: {
    router: '0x1414eD29FdFD322c3c0a830330ed982E2D629e76',
    wbot: '0xD5452816194a3784dBa983426cCe7c122F4abd30',
    usdt: '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C'
  }
});

export function loadNetworkConfig(env = process.env) {
  const key = (env.CESSIO_NETWORK ?? 'testnet').toLowerCase();
  if (key === 'testnet') return TESTNET;
  if (key !== 'mainnet') throw new Error('CESSIO_NETWORK must be testnet or mainnet');

  const required = ['BOT_MAINNET_RPC', 'CESSIO_RECEIVABLES_ADDRESS', 'CESSIO_SETTLEMENT_TOKEN_ADDRESS'];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Mainnet configuration is incomplete: ${missing.join(', ')}`);

  return Object.freeze({
    ...MAINNET_DEFAULTS,
    rpcUrl: env.BOT_MAINNET_RPC,
    explorerUrl: env.BOT_MAINNET_EXPLORER ?? MAINNET_DEFAULTS.explorerUrl,
    receivablesAddress: env.CESSIO_RECEIVABLES_ADDRESS,
    settlementTokenAddress: env.CESSIO_SETTLEMENT_TOKEN_ADDRESS
  });
}

export function publicNetworkConfig(network) {
  return {
    key: network.key,
    chainId: network.chainId,
    chainIdHex: network.chainIdHex,
    chainName: network.chainName,
    rpcUrl: network.rpcUrl,
    explorerUrl: network.explorerUrl,
    receivablesAddress: network.receivablesAddress,
    settlementTokenAddress: network.settlementTokenAddress,
    settlementTokenSymbol: network.settlementTokenSymbol,
    nativeCurrency: network.nativeCurrency,
    bdex: network.bdex
  };
}
