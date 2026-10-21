# Settle402

USDC payment links and invoices for AI agents and humans, on Base and Arbitrum. Built for YC's Fall 2026 RFS "The Best Time to Build in Crypto" (stablecoin applications and agentic commerce).

- **Create** an invoice in the browser. The link encodes the chain, recipient, amount, memo and start block in the URL fragment. Nothing is stored on a server.
- **Pay page** reads on-chain state through public RPCs (`eth_getLogs` / `eth_getTransactionReceipt`) and marks the invoice paid when it finds a USDC `Transfer` to the recipient for the exact amount.
- **Agent-readable**: every invoice shows an HTTP-402-style JSON payment request with ready-made `transfer` calldata. See `spec.html`.
- **Optional** payment through an injected wallet (`window.ethereum`). You don't need a wallet to verify a payment.

## Run
Static files only. Serve the folder (`python3 -m http.server`) or push it to GitHub Pages. `.nojekyll` is included.

Example (a real past Base transfer):
`index.html#c=base&to=0x17f707cf3edbbd5d9251d4bcdf9ad70a247d7b84&amt=64.716409&tx=0x8668d8c972a91d7027f4ca5174966226868d1027eff67a7ab381e5cc8050d1c6`

## Limitations
- Public RPCs are rate-limited and cap log ranges. Scans without a tx hash cover at most the last 200k blocks (about 4.6 days on Base) in 5k-block chunks.
- Matching uses the exact amount, recipient and start block. Two invoices with the same amount and recipient can't be told apart, so use unique amounts or the start block.
- Only native USDC is checked (not USDC.e or other tokens). The page is not an HTTP server, so it can't return a real 402 status.
- Not financial advice.

Built by Satoshi Drops 🪂 [@SatoshiDropsHQ](https://x.com/SatoshiDropsHQ)
