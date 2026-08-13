# Cessio

Cessio is an AI-underwritten receivables marketplace for compute and digital-service invoices. It turns completed work and delivery evidence into a structured funding decision, then records the assess, issue, fund, repay, and claim lifecycle on BOT Chain.

Live application: https://cessio.up.railway.app
Public X account: https://x.com/cessioapp

## What is included

- Evidence-aware underwriting for structured invoice metadata.
- Bounded approval and review decisions with a deterministic provider for local and Testnet development.
- Receivable lifecycle records and append-only audit events.
- Wallet connection and BOT Chain Testnet receipt read-back in the web app.
- Verified Testnet contracts and explorer-linked settlement proof.
- Railway deployment configuration with a `/health` endpoint.

The current release is Testnet Live. Railway uses PostgreSQL when `DATABASE_URL` is configured and falls back to the local file repository for development. Demo-mode Testnet creation remains intentionally bounded; general write endpoints require a verified wallet signature session.

## BOT Chain Testnet

Network: BOT Chain Testnet, chain ID `968`
RPC: `https://rpc.bohr.life`
Explorer: `https://scan.bohr.life`

| Contract | Address |
| --- | --- |
| CessioReceivables | [`0x212d99C7fC7C83901e8d6BB0F82d937F9735d248`](https://scan.bohr.life/address/0x212d99C7fC7C83901e8d6BB0F82d937F9735d248) |
| MockUSDT / cUSDT | [`0x4D0984B958b4376dE072DC098404c4afA9155C90`](https://scan.bohr.life/address/0x4D0984B958b4376dE072DC098404c4afA9155C90) |

Receipt #1 was completed on Testnet. The verified read-back shows `100 cUSDT` funded, `105 cUSDT` repaid, the investor claim recorded, and the receivables contract retaining `0 cUSDT` after settlement.

Lifecycle proof:

- [Deploy CessioReceivables](https://scan.bohr.life/tx/0xd1044c3ae6e110462ceb0851c121d7d895591d6b9184e113e7c9d6a38d4917ce)
- [Create receivable](https://scan.bohr.life/tx/0x7dce3dc96ec96195877547a299e71ab20d117b40c12c65c09e44d33af41c0b17)
- [Fund](https://scan.bohr.life/tx/0x14935a3db3e5fb093f8f23e8a8fd1781ebf4d65c8caf4d6c6d4167e34a50f4ee)
- [Repay](https://scan.bohr.life/tx/0xd87dfee7c77ef0d81278ad3ef1fa91475aaab4484a07e7c9d0b1a3a975d8252a)
- [Claim](https://scan.bohr.life/tx/0xc9ee384ea1004ca2c10a4c9ef2659c2d44c7631156ac66f8b3f20af249219186)

## Run locally

```powershell
Copy-Item .env.example .env
$env:ALLOW_UNAUTHENTICATED_WRITES='true'
npm start
```

`ALLOW_UNAUTHENTICATED_WRITES` is only for local/testnet development. The service rejects writes by default until wallet-signature authentication is added.

To run the web app without enabling writes:

```powershell
Copy-Item .env.example .env
npm start
```

### Railway persistence

1. In Railway, add a PostgreSQL service to the project.
2. In the Cessio service variables, add `DATABASE_URL` using the PostgreSQL service's connection reference.
3. Keep `ALLOW_UNAUTHENTICATED_WRITES=false`.
4. Keep `DEMO_MODE=true` only while the public Testnet demo is needed.
5. Redeploy and confirm `/health` reports `status: ok`, then create one demo record and verify it remains after a restart.

Without `DATABASE_URL`, the app uses `data/cessio.json`, which is not durable across Railway redeploys.

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
