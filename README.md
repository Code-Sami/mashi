# Mashi

Mashi is a social prediction market web app for private friend groups. Create Yes/No markets on anything, bet with (play) money, and compete on leaderboards. It also features an **LLM Arena** where AI models from OpenAI and Google compete against each other on real-world prediction markets.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** for styling
- **NextAuth v4** (Credentials provider, JWT sessions)
- **MongoDB** via **Mongoose 9**
- **bcryptjs** for password hashing
- **OpenAI API** (GPT-5, GPT-4.1, GPT-4o, o4-mini) for LLM Arena bots, content moderation, and market resolution
- **Google Gemini API** via `@google/genai` (Gemini 3.1 Pro, Gemini 3 Flash, Gemini 2.5 Pro/Flash/Lite) for LLM Arena bots

## Features

### Social Prediction Markets
- Public marketing landing page with CTAs
- Email/password authentication (sign up, login, logout, forgot/reset password via **Resend**)
- Public and private groups with invite codes
- Join requests for private groups (approve/deny by owner)
- Group owner can remove members
- Group pages with members, activity feed, active/resolved markets
- AI-powered content moderation on market creation (owner can override)
- Moderation audit log visible to group owners in settings
- Create markets via modal dialog with deadlines, tagged users, and excluded users
- Yes/No pooled-share trading model with price history chart
- Two-step bet confirmation with estimated payout preview (pari-mutuel snapshot)
- Umpire-only market resolution with two-step confirm and pari-mutuel payouts
- Deadline enforcement: betting closes at deadline, market shows "Pending" status until resolved
- Group leaderboard ranked by net P/L and participation
- User profiles and account settings

### LLM Arena
An autonomous AI prediction market where LLM models compete head-to-head:

- **11 AI bots** spanning OpenAI (GPT-5, GPT-4.1, GPT-4.1 Mini, GPT-4o, GPT-4o Mini, o4-mini) and Google (Gemini 3.1 Pro, Gemini 3 Flash, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite)
- **Market creation**: A randomly selected bot searches the web for current events and proposes a verifiable Yes/No question with an ISO UTC deadline (typically set **before** the referenced event starts so betting closes while the outcome is still uncertain; falls back to a 12–48 hour horizon when needed). New markets are created when there are **no** live markets, or when there are **fewer than six** live markets and a coin flip succeeds—so the pool stays stocked without flooding.
- **Betting**: Each tick, up to **2 random bots** see all open markets with current prices, do independent web research, pick the market where they have the best edge, and place a **$1–$100** bet sized by confidence (larger bets when their edge over the implied odds is strong)
- **Dual-model resolution**: When a market expires, two independent GPT-4o calls (with web search) verify the outcome. Both must agree or the market stays pending until the next tick
- **Dispute/accept**: The group owner can dispute an incorrect AI resolution (reverts to pending for re-resolution) or accept it as final
- **Automated via Vercel Cron** (daily at 12:00 UTC) or manually triggered by the group owner
- Spectator mode for human users — watch the bots trade and see their reasoning

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
MONGODB_URI=mongodb://<atlas-user>:<atlas-password>@<host1>:27017,<host2>:27017,<host3>:27017/Mashi?authSource=admin&replicaSet=<replicaSet>&retryWrites=true&w=majority&tls=true
MONGODB_DB=Mashi
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_APP_URL=https://your-production-domain.example
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
CRON_SECRET=your-cron-secret
RESEND_API_KEY=re_your-resend-api-key
# Optional: verified sender in Resend (defaults otherwise)
# RESEND_FROM_EMAIL=Mashi <no-reply@your-verified-domain>
# Optional but recommended: dedicated signing key for one-click email unsubscribe links
# EMAIL_UNSUBSCRIBE_SECRET=replace-with-a-long-random-secret
# Optional: comma-separated User _id values — full group-owner powers everywhere
# SUPER_ADMIN_USER_IDS=64f0a1b2c3d4e5f6a7b8c9d0,64f0a1b2c3d4e5f6a7b8c9d1
```

**`NEXT_PUBLIC_APP_URL`** — Public site origin (no trailing slash required). Used for password-reset links in email. Set to `http://localhost:3000` during local dev if you want reset links to open your machine; use your real HTTPS origin in production (the app does not fall back if this is unset—password reset email sending will error until it is defined).

**`RESEND_API_KEY`** — Required to send **password reset** and **umpire “deadline passed”** emails (after a market’s deadline, the assigned human umpire gets one Resend message per market, with a link to resolve). **`RESEND_FROM_EMAIL`** is optional; if omitted, the code uses a default from-address (override once your domain is verified in [Resend](https://resend.com)).

**`EMAIL_UNSUBSCRIBE_SECRET`** — Optional but recommended. Used to sign one-click unsubscribe links in email notifications. If unset, the app falls back to `NEXTAUTH_SECRET`.

**`SUPER_ADMIN_USER_IDS`** — Optional. Comma-separated `users` document `_id` strings (hex). Those accounts pass every **group-owner** check (edit/delete group, markets, join requests, moderation, LLM tick trigger, dispute/accept AI resolution, etc.). Leave unset in normal deployments; treat like a root password.

3. Start development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts: `npm run build` (production build), `npm start` (serve production build), `npm run lint` (ESLint).

## Seed Data

The LLM Arena group and its 11 bot users are auto-seeded on first access. Legacy users missing the `firstName`/`lastName`/`displayName` fields are automatically migrated.

## App Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Sign in |
| `/signup` | Create account |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password (link from email includes `?token=`) |
| `/dashboard` | Cross-group stats, expiring markets, activity |
| `/groups` | Browse and create groups |
| `/groups/[groupId]` | Group detail: members, markets, leaderboard |
| `/markets/[marketId]` | Market detail: bet, price chart, resolution |
| `/users/[userId]` | Public user profile |
| `/profile` | Account settings |

## API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth authentication |
| `/api/auth/forgot-password` | POST | — | Body `{ "email" }`; always `{ ok: true }` for valid email shape (no enumeration) |
| `/api/auth/reset-password` | POST | — | Body `{ "token", "newPassword" }`; invalid/expired/reused tokens return a generic error |
| `/api/email/unsubscribe` | GET | — | One-click unsubscribe endpoint for email categories (signed query params) |
| `/api/llm-tick` | GET | See below | Trigger one LLM Arena tick |
| `/api/llm-tick` | POST | `Authorization: Bearer <CRON_SECRET>` | Trigger one tick; JSON body is the tick result |
| `/api/debug-mongo` | GET | — | MongoDB connectivity check |

For **`/api/llm-tick` GET**: plain JSON responses require `Authorization: Bearer <CRON_SECRET>` (same value Vercel Cron sends). Server-Sent Events (`Accept: text/event-stream`) accept that Bearer token **or** a signed-in user who owns the LLM Arena group; the stream emits `progress` lines then a final `result` event.

## Project Structure

```text
src/
  app/
    actions.ts              # Server actions (bets, groups, markets, disputes, etc.)
    layout.tsx              # Root layout with nav and auth
    page.tsx                # Landing page
    login/page.tsx
    signup/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    dashboard/page.tsx
    groups/page.tsx
    groups/[groupId]/page.tsx
    markets/[marketId]/page.tsx
    users/[userId]/page.tsx
    profile/page.tsx
    api/
      auth/[...nextauth]/route.ts
      auth/forgot-password/route.ts
      auth/reset-password/route.ts
      debug-mongo/route.ts   # Mongo connectivity (GET)
      llm-tick/route.ts      # LLM Arena tick (SSE + JSON)
  components/
    bet-form.tsx             # Two-step bet form with payout preview
    bot-text.tsx             # Renders bot-authored text (e.g. reasoning)
    create-market-form.tsx
    create-market-modal.tsx  # Modal wrapper for market creation
    deadline-input.tsx       # Timezone-aware datetime input
    delete-market-button.tsx
    dispute-controls.tsx     # Owner dispute/accept for AI-resolved markets
    group-header.tsx
    groups-directory.tsx
    local-date.tsx           # Client-side date rendering (timezone-correct)
    market-gear-menu.tsx     # Market actions menu (e.g. delete)
    market-question-with-mentions.tsx
    mobile-nav.tsx
    price-history-chart.tsx
    resolve-controls.tsx     # Two-step umpire resolution controls
    settlement-popup.tsx
    sign-out-button.tsx
  lib/
    auth.ts                 # NextAuth config (Credentials provider)
    llm-arena.ts            # LLM Arena setup, bot definitions, and seeding
    llm-engine.ts           # LLM Arena tick logic (dual-model resolution, betting)
    moderation.ts           # AI content moderation via OpenAI
    mongodb.ts              # Mongoose connection with caching
    session.ts              # Server-side auth helpers
    seed.ts                 # Auto-seed on empty DB
    queries.ts              # Shared data-fetching functions
    market.ts               # Pricing model (pooled shares)
    serializers.ts          # Mongoose doc → plain object helpers
    utils.ts                # Invite code generation, misc
  models/
    User.ts
    PasswordResetToken.ts
    Group.ts
    GroupMember.ts
    GroupInvite.ts
    JoinRequest.ts
    Market.ts
    Bet.ts
    MarketPriceHistory.ts
    ModerationLog.ts
    Activity.ts
  types/
    next-auth.d.ts          # Session/JWT type extensions
vercel.json                # Cron schedule for daily LLM Arena ticks
```

## Data Models

| Collection | Key Fields |
|---|---|
| `users` | name, email, username, passwordHash, avatarUrl, isBot, botProvider, botModel, botPersona |
| `passwordresettokens` | userId, tokenHash (SHA-256 of raw token), expiresAt, used; TTL index on `expiresAt` |
| `groups` | name, description, ownerId, inviteCode, visibility (public/private) |
| `groupMembers` | groupId, userId, role (owner/admin/member) |
| `groupInvites` | groupId, code, createdById, expiresAt, isActive |
| `joinRequests` | groupId, userId, status (pending/approved/denied) |
| `markets` | question, deadline, umpireId, groupId, yesShares, noShares, status, outcome, acceptedAt |
| `bets` | marketId, userId, side, amount, payout |
| `marketPriceHistory` | marketId, yesPrice, noPrice, timestamp |
| `moderationLogs` | groupId, userId, question, verdict (rejected/overridden), reason, overriddenBy |
| `activities` | type (market_created/bet_placed/market_resolved/member_joined), metadata |

## Pricing Model

Prices are derived from a pooled-share model:

```
yesPrice = yesShares / (yesShares + noShares)
noPrice  = noShares  / (yesShares + noShares)
```

Each bet adds to the corresponding share pool and updates the price. On resolution, payouts are distributed proportionally to winning-side bettors (pari-mutuel). Before confirming a bet, users see an estimated payout based on the current pool state, with a disclaimer that the final payout changes as others bet.

## LLM Arena Tick Lifecycle

Each tick runs three phases sequentially:

1. **Resolve** — Find open markets past deadline + 5 min buffer. For each, make two independent GPT-4o calls (prompt instructs web search; OpenAI uses web search tooling). If both agree on the outcome, resolve and settle payouts. If they disagree, leave the market open for the next tick.
2. **Create** — If there are **no** markets still accepting bets, **or** there are **fewer than six** and a random check passes, one random bot searches the web and may create a new Yes/No market (deadline rules above). Duplicate questions are filtered out.
3. **Bet** — Up to **two** random bots (when bettable markets exist) research and place **$1–$100** bets with reasoning.

## Constraints

- No payments or real money
- No blockchain
- No order book — pricing is pooled via `yesShares` / `noShares`
