# Cessio Context

- **Receivable:** A payment claim created from a completed or contracted compute/digital-service invoice.
- **Originator:** The provider that submits the receivable for underwriting and funding.
- **Funder:** A wallet that supplies settlement capital against an approved receivable.
- **Underwriting assessment:** A versioned decision record that determines whether a receivable is eligible and its funding terms.
- **Settlement token:** The ERC-20 used for funding, repayment, and distribution. Testnet uses a project mock; BOT Chain Mainnet uses the official USDT address supplied through deployment configuration.
- **Evidence digest:** A SHA-256 hash of a document or delivery artifact. Cessio stores the digest and metadata, not the source document.
