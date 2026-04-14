# Mashi

Mashi is a social prediction market web app for private friend groups.

## Current Product Scope

- Public marketing landing page with CTAs
- Email/password auth (sign up, login, logout) using NextAuth
- Private group management with invite codes
- Group pages with members, activity feed, active/resolved markets
- Yes/No pooled-share trading model with price history
- Umpire-only market resolution
- Group leaderboard by winnings + participation
- MongoDB-backed persistence for all core entities

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

## App Routes

- `/` landing
- `/login`
- `/signup`
- `/dashboard`
- `/groups`
- `/groups/[groupId]`
- `/markets/[marketId]`
- `/profile`

## Project Structure

```text
src/
  app/
    actions.ts
    page.tsx
    login/page.tsx
    signup/page.tsx
    dashboard/page.tsx
    groups/page.tsx
    groups/[groupId]/page.tsx
    markets/[marketId]/page.tsx
    profile/page.tsx
    api/auth/[...nextauth]/route.ts
    api/debug-mongo/route.ts
  lib/
    auth.ts
    mongodb.ts
    session.ts
    seed.ts
    queries.ts
    market.ts
    serializers.ts
    utils.ts
  models/
    User.ts
    Group.ts
    GroupMember.ts
    GroupInvite.ts
    Market.ts
    Bet.ts
    MarketPriceHistory.ts
    Activity.ts
  types/
    next-auth.d.ts
```

## Data Models

- `users`
- `groups`
- `groupMembers`
- `groupInvites`
- `markets`
- `bets`
- `marketPriceHistory`
- `activities`

## Constraints

- No payments
- No real money
- No blockchain
- No order book
- Pricing is pooled via `yesShares` / `noShares`
