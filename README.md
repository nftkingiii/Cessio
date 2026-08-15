# Cessio

Cessio is an AI-underwritten receivables marketplace for compute and digital-service invoices. It turns completed work and delivery evidence into a structured funding decision, then records the assess, issue, fund, repay, and claim lifecycle on BOT Chain.

Live application: https://cessio.up.railway.app
Public X account: https://x.com/cessioapp

## What is included

- Evidence-aware underwriting for structured invoice metadata.
- Bounded approval and review decisions with a deterministic provider for local and Mainnet demo operation.
- Receivable lifecycle records and append-only audit events.
- Wallet connection and BOT Chain Mainnet receipt read-back in the web app.
- Verified Mainnet contracts and explorer-linked settlement proof.
- Railway deployment configuration with a `/health` endpoint.

The current public release is a BOT Chain Mainnet pilot. Railway uses PostgreSQL when `DATABASE_URL` is configured and falls back to the local file repository for development. Controlled demo creation remains enabled for product inspection; general write endpoints require a verified wallet signature session.

## BOT Chain Mainnet

Network: BOT Chain Mainnet, chain ID `677`
RPC: `https://rpc.botchain.ai`
Explorer: `https://scan.botchain.ai`

| Contract | Address |
| --- | --- |
| CessioReceivables | [`0x482910B7E491044be44aB1415F92dfa7c9e10A2B`](https://scan.botchain.ai/address/0x482910B7E491044be44aB1415F92dfa7c9e10A2B) |
| Official BOT Chain USDT | [`0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C`](https://scan.botchain.ai/address/0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C) |

The public app is configured for Mainnet. Historical Testnet lifecycle artifacts remain in git history as development evidence; new public activity uses the verified Mainnet receivables contract and official BOT Chain USDT.

Lifecycle proof:

- [Deploy CessioReceivables](https://scan.botchain.ai/tx/0x6f1b8d106c434706199993f83c401fe836ea15f7b13c7e756ec1c48f1f61a7e5)

Mainnet registration, funding, repayment, and claim evidence will be linked here as each controlled demo step is completed.

## Run locally

```powershell
Copy-Item .env.example .env
$env:ALLOW_UNAUTHENTICATED_WRITES='true'
npm start
```

`ALLOW_UNAUTHENTICATED_WRITES` is only for local development. The public service rejects writes by default until wallet-signature authentication is completed.

To run the web app without enabling writes:

```powershell
Copy-Item .env.example .env
npm start
```

### Railway persistence

1. In Railway, add a PostgreSQL service to the project.
2. In the Cessio service variables, add `DATABASE_URL` using the PostgreSQL service's connection reference.
3. Keep `ALLOW_UNAUTHENTICATED_WRITES=false`.
4. Keep `DEMO_MODE=true` only while the controlled public demo is needed.
5. Redeploy and confirm `/health` reports `status: ok`, then create one demo record and verify it remains after a restart.

Without `DATABASE_URL`, the app uses `data/cessio.json`, which is not durable across Railway redeploys.

### Mainnet configuration

The public deployment runs on BOT Chain Mainnet. Railway provides `CESSIO_NETWORK=mainnet`, `BOT_MAINNET_RPC`, `CESSIO_RECEIVABLES_ADDRESS`, and `CESSIO_SETTLEMENT_TOKEN_ADDRESS`; startup fails if any required Mainnet value is missing. The public `/v1/network` endpoint is the single source for the browser wallet, explorer, receipt reader, settlement token, and BDEX route.

Current Mainnet deployment: CessioReceivables at [`0x482910B7E491044be44aB1415F92dfa7c9e10A2B`](https://scan.botchain.ai/address/0x482910B7E491044be44aB1415F92dfa7c9e10A2B), deployed by [`0x6f1b8d106c434706199993f83c401fe836ea15f7b13c7e756ec1c48f1f61a7e5`](https://scan.botchain.ai/tx/0x6f1b8d106c434706199993f83c401fe836ea15f7b13c7e756ec1c48f1f61a7e5). BOTScan source verification is confirmed with Solidity `v0.8.24+commit.e11b9ed9`, Cancun EVM, optimizer enabled with `200` runs, and the underwriter constructor argument. Direct RPC read-back confirms owner and underwriter are `0x89fa09831c33A9651dA38aC37B25E058B6409Cc8`.

#### Mainnet contract deployment

`contracts/script/DeployMainnet.s.sol` is intentionally separate from the Testnet script: it deploys only `CessioReceivables`, never `MockUSDT`. It refuses any chain except BOT Chain Mainnet (`677`) and requires a deployed settlement-token address before broadcast. Use the official BOT Chain USDT address for `SETTLEMENT_TOKEN_ADDRESS`.

```powershell
Set-Location contracts
$env:UNDERWRITER_ADDRESS = "<the wallet that may register receivables>"
$env:SETTLEMENT_TOKEN_ADDRESS = "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C"
forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url https://rpc.botchain.ai --account <local-keystore-name> --broadcast
```

Before broadcasting, confirm that the selected account is the displayed `UNDERWRITER_ADDRESS`. After deployment, verify the source on BOTScan, set `CESSIO_NETWORK=mainnet` plus the three required Railway variables, redeploy Railway, then prove one wallet-issued registration and funding transaction through the public app.

Open http://localhost:3001 after the server starts.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Deployment health and configured underwriting mode |
| `POST` | `/v1/underwriting/assessments` | Assess invoice metadata and funding terms |
| `POST` | `/v1/receivables` | Create a receivable from an approved assessment |
| `GET` | `/v1/receivables` | List receivables without sensitive evidence data |
| `GET` | `/v1/receivables/:id` | Read one receivable and its audit trail |
| `POST` | `/v1/receivables/:id/chain-events` | Attach a Testnet/Mainnet transaction reference |
| `GET` | `/v1/auth/nonce/:address` | Issue a short-lived wallet-signature nonce |
| `POST` | `/v1/auth/verify` | Verify a wallet signature and return a short-lived session token |

## Development commands

```powershell
npm test
npm run brand
```

The contract project uses Foundry. Contract deployment scripts and Testnet lifecycle scripts live under `contracts/script`.

## Security boundaries

- The API accepts metadata and SHA-256 evidence digests only; raw invoices and credentials are deliberately out of scope.
- Write endpoints have bounded request sizes, schema validation, rate limits, restrictive CORS, and security headers.
- AI output is parsed as data and validated before it can affect a decision.
- The current file repository is for local/demo use. Railway production needs a managed PostgreSQL repository before public customer data is accepted.

## Repository layout

```text
contracts/   Foundry contracts, deployment, and lifecycle scripts
public/      Cessio web app and brand assets
src/         HTTP API, underwriting, repository, and chain reader
test/        API, service, underwriting, and static asset tests
scripts/     UI capture, brand rendering, and submission document tools
```

## Submission assets

- [`cessio-pitch-deck.pdf`](output/pdf/cessio-pitch-deck.pdf)
- [`cessio-onchain-evidence.pdf`](output/pdf/cessio-onchain-evidence.pdf)
