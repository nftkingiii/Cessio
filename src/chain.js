const BOT_TESTNET_RPC = 'https://rpc.bohr.life';
const CESSIO_RECEIVABLES = '0x212d99C7fC7C83901e8d6BB0F82d937F9735d248';
const GET_RECEIVABLE_SELECTOR = '0xa94c9f7d';

export function createTestnetReceiptReader({ fetchImpl = fetch, rpcUrl = BOT_TESTNET_RPC } = {}) {
  return Object.freeze({
    async getReceipt(receivableId) {
      if (!Number.isSafeInteger(receivableId) || receivableId < 1) throw new Error('Invalid receipt ID');
      const response = await withTimeout(fetchImpl(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: receivableId,
          method: 'eth_call',
          params: [{ to: CESSIO_RECEIVABLES, data: `${GET_RECEIVABLE_SELECTOR}${encodeWord(receivableId)}` }, 'latest']
        })
      }));
      if (!response.ok) throw new Error('BOT Testnet RPC request failed');
      const payload = await response.json();
      if (payload.error || !payload.result) throw new Error('BOT Testnet receipt read failed');
      return decodeReceipt(receivableId, payload.result);
    }
  });
}

function withTimeout(promise, timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('BOT Testnet RPC timed out')), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

function encodeWord(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function decodeReceipt(id, data) {
  if (typeof data !== 'string' || data.length !== 642) throw new Error('Unexpected BOT Testnet receipt response');
  const wordAt = (index) => data.slice(2 + index * 64, 2 + (index + 1) * 64);
  return {
    id,
    originator: `0x${wordAt(0).slice(-40)}`,
    obligor: `0x${wordAt(1).slice(-40)}`,
    principal: BigInt(`0x${wordAt(3)}`).toString(),
    repayment: BigInt(`0x${wordAt(4)}`).toString(),
    status: Number.parseInt(wordAt(6), 16),
    totalFunded: BigInt(`0x${wordAt(9)}`).toString()
  };
}
