# Mashi

Mashi is a social prediction market web app for private friend groups. Create Yes/No markets on anything, bet with (play) money, and compete on leaderboards.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** for styling
- **NextAuth v4** (Credentials provider, JWT sessions)
- **MongoDB** via **Mongoose 9**
- **bcryptjs** for password hashing

## Features

- Public marketing landing page with CTAs
- Email/password authentication (sign up, login, logout)
- Public and private groups with invite codes
- Join requests for private groups (approve/deny by owner)
- Group pages with members, activity feed, active/resolved markets
- Create markets via modal dialog with deadlines, tagged users, and excluded users
- Yes/No pooled-share trading model with price history chart
- Two-step bet confirmation with estimated payout preview (pari-mutuel snapshot)
- Umpire-only market resolution with two-step confirm and pari-mutuel payouts
- Deadline enforcement: betting closes at deadline, market shows "Pending" status until umpire resolves
- Group leaderboard ranked by net P/L and participation
- User profiles and account settings

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
```

3. Start development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed Data

If the database is empty, Mashi seeds sample data automatically:

- Users:
  - `sam@mashi.app`
  - `maya@mashi.app`
  - `jordan@mashi.app`
  - `alex@mashi.app`
- Default password for seeded users: `password123`
- Group: `Weekend Crew`
- Invite code generated and stored in DB
- Initial market, bets, activity, and price history

A helper script is available to reset seeded user names:

```bash
node scripts/reset-seeded-names.js
```

## App Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Sign in |
| `/signup` | Create account |
| `/dashboard` | Cross-group stats, expiring markets, activity |
| `/groups` | Browse and create groups |
| `/groups/[groupId]` | Group detail: members, markets, leaderboard |
| `/markets/[marketId]` | Market detail: bet, price chart, resolution |
| `/users/[userId]` | Public user profile |
| `/profile` | Account settings |

## Project Structure

```text
src/
  app/
    actions.ts              # Server actions (bets, groups, markets, etc.)
    layout.tsx              # Root layout with nav and auth
    page.tsx                # Landing page
    login/page.tsx
    signup/page.tsx
    dashboard/page.tsx
    groups/page.tsx
    groups/[groupId]/page.tsx
    markets/[marketId]/page.tsx
    users/[userId]/page.tsx
    profile/page.tsx
    api/
      auth/[...nextauth]/route.ts
      debug-mongo/route.ts
  components/
    bet-form.tsx             # Two-step bet form with payout preview
    create-market-form.tsx
    create-market-modal.tsx  # Modal wrapper for market creation
    group-header.tsx
    groups-directory.tsx
    market-question-with-mentions.tsx
    mobile-nav.tsx
    price-history-chart.tsx
    resolve-controls.tsx     # Two-step umpire resolution controls
    settlement-popup.tsx
    sign-out-button.tsx
  lib/
    auth.ts                 # NextAuth config (Credentials provider)
    mongodb.ts              # Mongoose connection with caching
    session.ts              # Server-side auth helpers
    seed.ts                 # Auto-seed on empty DB
    queries.ts              # Shared data-fetching functions
    market.ts               # Pricing model (pooled shares)
    serializers.ts          # Mongoose doc → plain object helpers
    utils.ts                # Invite code generation, misc
  models/
    User.ts
    Group.ts
    GroupMember.ts
    GroupInvite.ts
    JoinRequest.ts
    Market.ts
    Bet.ts
    MarketPriceHistory.ts
    Activity.ts
  types/
    next-auth.d.ts          # Session/JWT type extensions
scripts/
  reset-seeded-names.js    # Reset seeded user display names
```

## Data Models

| Collection | Key Fields |
|---|---|
| `users` | name, email, username, passwordHash, avatarUrl |
| `groups` | name, description, ownerId, inviteCode, visibility (public/private) |
| `groupMembers` | groupId, userId, role (owner/admin/member) |
| `groupInvites` | groupId, code, createdById, expiresAt, isActive |
| `joinRequests` | groupId, userId, status (pending/approved/denied) |
| `markets` | question, deadline, umpireId, groupId, yesShares, noShares, status, outcome |
| `bets` | marketId, userId, side, amount, payout |
| `marketPriceHistory` | marketId, yesPrice, noPrice, timestamp |
| `activities` | type (market_created/bet_placed/market_resolved/member_joined) |

## Pricing Model

Prices are derived from a pooled-share model:

```
yesPrice = yesShares / (yesShares + noShares)
noPrice  = noShares  / (yesShares + noShares)
```

Each bet adds to the corresponding share pool and updates the price. On resolution, payouts are distributed proportionally to winning-side bettors (pari-mutuel). Before confirming a bet, users see an estimated payout based on the current pool state, with a disclaimer that the final payout changes as others bet.

## Constraints

- No payments or real money
- No blockchain
- No order book — pricing is pooled via `yesShares` / `noShares`
