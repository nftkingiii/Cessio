# Cessio API

Backend for Cessio, an AI-underwritten receivables marketplace for compute and digital-service invoices.

The first vertical slice supports:

- invoice metadata intake without storing raw documents;
- deterministic underwriting decisions with a validated AI-provider extension point;
- receivable creation and lifecycle records;
- wallet and contract transaction references for BOT Chain Testnet (`968`) and Mainnet (`677`);
- append-only audit events and a Railway-friendly health endpoint.

## Run locally

```powershell
Copy-Item .env.example .env
$env:ALLOW_UNAUTHENTICATED_WRITES='true'
npm start
```

`ALLOW_UNAUTHENTICATED_WRITES` is only for local/testnet development. The service rejects writes by default until wallet-signature authentication is added.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Deployment health and configured underwriting mode |
| `POST` | `/v1/underwriting/assessments` | Assess invoice metadata and funding terms |
| `POST` | `/v1/receivables` | Create a receivable from an approved assessment |
| `GET` | `/v1/receivables` | List receivables without sensitive evidence data |
| `GET` | `/v1/receivables/:id` | Read one receivable and its audit trail |
| `POST` | `/v1/receivables/:id/chain-events` | Attach a Testnet/Mainnet transaction reference |

## Testnet deployment path

1. Deploy a mock USDT and the Cessio contracts to BOT Chain Testnet (chain ID `968`).
2. Set `ALLOW_UNAUTHENTICATED_WRITES=true` only in the test deployment while wallet-auth work is underway.
3. Create an assessment, create an approved receivable, then attach the contract transaction hash through `/chain-events`.
4. Preserve the health URL, API request IDs, contract addresses, and explorer transaction links for the Mainnet gas-support request.

## Security boundaries

- The API accepts metadata and SHA-256 evidence digests only; raw invoices and credentials are deliberately out of scope.
- Write endpoints have bounded request sizes, schema validation, rate limits, restrictive CORS, and security headers.
- AI output is parsed as data and validated before it can affect a decision.
- The current file repository is for local/demo use. Railway production needs a managed PostgreSQL repository before public customer data is accepted.
