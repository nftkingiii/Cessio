# Cessio Project State

## Current

- Public app: `https://cessio.up.railway.app`
- Repository: `https://github.com/nftkingiii/Cessio`
- Active network: BOT Chain Testnet (chain ID 968)
- Testnet receivables contract: `0x212d99C7fC7C83901e8d6BB0F82d937F9735d248`
- Testnet settlement token: `0x4D0984B958b4376dE072DC098404c4afA9155C90`

## Latest Milestone

- Environment configuration is fail-closed: `CESSIO_NETWORK=mainnet` requires `BOT_MAINNET_RPC`, `CESSIO_RECEIVABLES_ADDRESS`, and `CESSIO_SETTLEMENT_TOKEN_ADDRESS`.
- The API exposes `/v1/network`; the browser loads it before wallet initialization and uses it for chain, contract, token, explorer, and BDEX settings.

## Next

1. Deploy and verify the CessioReceivables contract on BOT Chain Mainnet.
2. Set the three required Mainnet Railway variables and redeploy.
3. Execute and preserve one real mainnet registration, funding, repayment, and claim lifecycle before calling the mainnet release ready.
