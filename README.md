# PumpMeme — Memecoin Launchpad on Unicity Sphere

Live: https://pumpmeme-sphere.vercel.app
Repo: https://github.com/pawan4292/Pumpmeme

## Track

**DeFi** — PumpMeme is a bonding-curve memecoin launchpad and trading protocol on Unicity Sphere testnet2, with two autonomous on-chain agents managing graduation and risk assessment.

## Agentic (no human in the loop)

PumpMeme runs two fully autonomous agents, triggered on a schedule (via QStash) every ~5–7 minutes with zero manual intervention:

- **Graduation agent** (`/api/agent/graduate`) — checks every active token's real market cap (derived from real trades) against a fixed graduation threshold. Any token that crosses it is automatically migrated: the agent's own server-side Sphere wallet executes a real on-chain liquidity transfer, marks the token `graduated` in the database, and logs the action.
- **Risk-scoring agent** (`/api/agent/risk-score`) — recomputes a risk score for every active token from real on-chain holder data (top-holder concentration, creator sell activity, holder count). Scores update automatically as trading activity changes; a risk flag change is logged to the activity feed.

Both endpoints are secured with a shared cron secret and are only ever invoked by the scheduler — there is no admin panel or manual trigger for either action.

This project does **not** use AstridOS.

## Real data only

Every number in the UI — price, market cap, supply, holder count, trade history, risk score — is derived from either a confirmed on-chain Unicity testnet2 transfer or a database row written only after such a transfer. No mocked, seeded, or simulated data is used anywhere.

## Tech stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase (Postgres) via Drizzle ORM
- `@unicitylabs/sphere-sdk` for wallet connect, balance reads, and all transfers
- QStash (Upstash) as the cron scheduler for the two autonomous agents

## Run instructions (testnet2)

1. Clone the repo and install dependencies:
   ```
   git clone https://github.com/pawan4292/Pumpmeme
   cd Pumpmeme
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in:
   - `DATABASE_URL` — Supabase Postgres connection string (session pooler recommended)
   - `SPHERE_ORACLE_API_KEY`
   - `UCT_COIN_ID`
   - `AGENT_WALLET_MNEMONIC` — server-side wallet used for graduation transfers and sell payouts
   - `CRON_SECRET` — shared secret checked by both agent endpoints
   - `NEXT_PUBLIC_PLATFORM_TREASURY` — address that receives creation fees and buy payments

3. Push the schema to your database:
   ```
   npx drizzle-kit push
   ```

4. Run locally:
   ```
   npm run dev
   ```

5. Deploy to Vercel and set the same environment variables in the project's Environment Variables settings.

6. Set up the two autonomous agent schedules in QStash (or any scheduler), each firing every 5 minutes:
   - `POST https://<your-deployment>/api/agent/graduate` with header `x-cron-secret: <CRON_SECRET>`
   - `POST https://<your-deployment>/api/agent/risk-score` with header `x-cron-secret: <CRON_SECRET>`

7. Fund a Sphere testnet2 wallet via the faucet (https://faucet.unicity.network/faucet/) to create and trade tokens.

## Core flows

- **Create** — pay a real 2 UCT creation fee, which seeds that token's bonding curve reserve. Token row is written only after the fee transfer is confirmed on-chain.
- **Trade** — buy sends real UCT to the platform treasury; sell triggers a real payout from the agent wallet back to the seller. Price and market cap are computed live from the bonding curve.
- **Graduate** — handled entirely by the autonomous graduation agent described above.
- **Risk** — handled entirely by the autonomous risk-scoring agent described above.