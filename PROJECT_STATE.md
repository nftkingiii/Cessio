# Cessio Project State

## Current

- Public app: `https://cessio.up.railway.app`
- Repository: `https://github.com/nftkingiii/Cessio`
- Active network: BOT Chain Mainnet (chain ID 677)
- Testnet receivables contract: `0x212d99C7fC7C83901e8d6BB0F82d937F9735d248`
- Testnet settlement token: `0x4D0984B958b4376dE072DC098404c4afA9155C90`
- Mainnet receivables contract: `0x482910B7E491044be44aB1415F92dfa7c9e10A2B`
- Mainnet deployment transaction: `0x6f1b8d106c434706199993f83c401fe836ea15f7b13c7e756ec1c48f1f61a7e5`
- Mainnet settlement token: official BOT Chain USDT `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C`

## Latest Milestone

- Environment configuration is fail-closed: `CESSIO_NETWORK=mainnet` requires `BOT_MAINNET_RPC`, `CESSIO_RECEIVABLES_ADDRESS`, and `CESSIO_SETTLEMENT_TOKEN_ADDRESS`.
- The API exposes `/v1/network`; the browser loads it before wallet initialization and uses it for chain, contract, token, explorer, and BDEX settings.
- `contracts/script/DeployMainnet.s.sol` deploys only `CessioReceivables`, refuses non-Mainnet chains, and checks that the selected settlement-token address has code. It never deploys Testnet's `MockUSDT`.
- The user confirmed `0x89fa09831c33A9651dA38aC37B25E058B6409Cc8` as the permanent Mainnet deployer/owner and trusted underwriter.
- Mainnet deployment was broadcast successfully on 2026-08-15; receipt status is `1`, and direct RPC read-back confirms deployed bytecode plus matching owner and underwriter.
- Mainnet source verification is confirmed by BOTScan's contract API: `CessioReceivables`, Solidity `v0.8.24+commit.e11b9ed9`, Cancun EVM, optimizer enabled with `200` runs, constructor argument set to the confirmed underwriter.

## Next

1. Complete the controlled Mainnet demo through the public app and preserve the registration and funding transaction evidence.
2. Independently review the contract's custody, trusted-underwriter, cancellation, and investor-refund terms before inviting broader Mainnet funding.
3. Execute and preserve one full mainnet registration, funding, repayment, and claim lifecycle before calling the public release ready.
