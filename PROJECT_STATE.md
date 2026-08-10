# Cessio Project State

## Current milestone

BOT Chain Testnet contracts deployed and read back successfully on 2026-08-10.

## Verified testnet evidence

- Network: BOT Chain Testnet, chain ID `968`, RPC `https://rpc.bohr.life`.
- Deployer, owner, and underwriter: `0x89fa09831c33A9651dA38aC37B25E058B6409Cc8`.
- Canonical MockUSDT: `0x4D0984B958b4376dE072DC098404c4afA9155C90`.
- Canonical CessioReceivables: `0x212d99C7fC7C83901e8d6BB0F82d937F9735d248`.
- Canonical MockUSDT deploy transaction: `0x5d22d66ee93011761291dbe8acafa790361ec9d9ff682aa945b950bdc82d27ec`.
- Canonical CessioReceivables deploy transaction: `0xd1044c3ae6e110462ceb0851c121d7d895591d6b9184e113e7c9d6a38d4917ce`.
- Earlier smoke-test deployment was superseded before any cUSDT user-flow activity because full funding did not release principal to the originator.
- RPC read-back: bytecode exists at both addresses; `owner` and `underwriter` equal the deployer; `nextReceivableId` is `1`.
- Lifecycle receipt `#1` was completed through the Testnet wallet on 2026-08-10. RPC read-back shows status `Repaid`, `100 cUSDT` funded, the wallet claim recorded, `105 cUSDT` returned to the wallet, and `0 cUSDT` retained by the receivables contract.
- Lifecycle transactions:
  - Mint: `0x933c750179f705383e598309555f7ba577224c2baf7630c5eb74a11cf213adc0`.
  - Create receivable: `0x7dce3dc96ec96195877547a299e71ab20d117b40c12c65c09e44d33af41c0b17`.
  - Fund: `0x14935a3db3e5fb093f8f23e8a8fd1781ebf4d65c8caf4d6c6d4167e34a50f4ee`.
  - Repay: `0xd87dfee7c77ef0d81278ad3ef1fa91475aaab4484a07e7c9d0b1a3a975d8252a`.
  - Claim: `0xc9ee384ea1004ca2c10a4c9ef2659c2d44c7631156ac66f8b3f20af249219186`.
- Source verification: CessioReceivables and MockUSDT were both verified through BOTScan's Blockscout verifier with Solidity `v0.8.24+commit.e11b9ed9` and optimizer runs `200`.
- Frontend integration: `public/app.js` reads receipt `#1` directly from the BOT Testnet RPC, supports injected-wallet connection and network switching, and supports separate approval plus funding confirmations when configured against an open receipt. The visible receipt is settled, so the fund action intentionally remains disabled.

## Next proof steps

1. Redeploy the corrected settlement version: on full funding, principal now transfers to the originator.
2. Verify both corrected sources on the Testnet explorer.
3. Create an open Testnet receipt and exercise it through the live wallet UI after public deployment.
4. Add wallet-signature authentication and managed persistence before accepting public receivable submissions.

## Security

- Use the new Testnet burner wallet only. Do not paste its private key into chat, source control, screenshots, or logs.
