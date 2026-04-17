/**
 * One-time script to find and remove orphaned data in MongoDB:
 * - Bets referencing non-existent markets
 * - Price history referencing non-existent markets
 * - Activities referencing non-existent groups or markets
 * - Group memberships referencing non-existent groups or users
 * - Join requests referencing non-existent groups or users
 * - Group invites referencing non-existent groups
 * - Moderation logs referencing non-existent groups
 *
 * Run: node scripts/cleanup-orphans.js
 */

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

async function main() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    const envPath = path.resolve(__dirname, "..", ".env.local");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const match = line.match(/^MONGODB_URI=(.+)/);
        if (match) {
          uri = match[1].trim();
          break;
        }
      }
    }
  }
  if (!uri) {
    console.error("MONGODB_URI not found in environment or .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("Mashi");

  const allMarketIds = new Set(
    (await db.collection("markets").find({}, { projection: { _id: 1 } }).toArray())
      .map((m) => m._id.toString())
  );
  const allGroupIds = new Set(
    (await db.collection("groups").find({}, { projection: { _id: 1 } }).toArray())
      .map((g) => g._id.toString())
  );
  const allUserIds = new Set(
    (await db.collection("users").find({}, { projection: { _id: 1 } }).toArray())
      .map((u) => u._id.toString())
  );

  console.log(`Live counts: ${allMarketIds.size} markets, ${allGroupIds.size} groups, ${allUserIds.size} users\n`);

  // Orphaned bets (market no longer exists)
  const allBets = await db.collection("bets").find({}).toArray();
  const orphanBetIds = allBets
    .filter((b) => !allMarketIds.has(b.marketId.toString()))
    .map((b) => b._id);
  if (orphanBetIds.length > 0) {
    const r = await db.collection("bets").deleteMany({ _id: { $in: orphanBetIds } });
    console.log(`Deleted ${r.deletedCount} orphaned bets`);
  } else {
    console.log("No orphaned bets");
  }

  // Orphaned price history
  const allHistory = await db.collection("marketpricehistories").find({}).toArray();
  const orphanHistoryIds = allHistory
    .filter((h) => !allMarketIds.has(h.marketId.toString()))
    .map((h) => h._id);
  if (orphanHistoryIds.length > 0) {
    const r = await db.collection("marketpricehistories").deleteMany({ _id: { $in: orphanHistoryIds } });
    console.log(`Deleted ${r.deletedCount} orphaned price history entries`);
  } else {
    console.log("No orphaned price history");
  }

  // Orphaned activities (group or market no longer exists)
  const allActivities = await db.collection("activities").find({}).toArray();
  const orphanActivityIds = allActivities
    .filter((a) => {
      if (a.groupId && !allGroupIds.has(a.groupId.toString())) return true;
      if (a.marketId && !allMarketIds.has(a.marketId.toString())) return true;
      return false;
    })
    .map((a) => a._id);
  if (orphanActivityIds.length > 0) {
    const r = await db.collection("activities").deleteMany({ _id: { $in: orphanActivityIds } });
    console.log(`Deleted ${r.deletedCount} orphaned activities`);
  } else {
    console.log("No orphaned activities");
  }

  // Orphaned group memberships
  const allMembers = await db.collection("groupmembers").find({}).toArray();
  const orphanMemberIds = allMembers
    .filter((m) => !allGroupIds.has(m.groupId.toString()) || !allUserIds.has(m.userId.toString()))
    .map((m) => m._id);
  if (orphanMemberIds.length > 0) {
    const r = await db.collection("groupmembers").deleteMany({ _id: { $in: orphanMemberIds } });
    console.log(`Deleted ${r.deletedCount} orphaned group memberships`);
  } else {
    console.log("No orphaned group memberships");
  }

  // Orphaned join requests
  const allRequests = await db.collection("joinrequests").find({}).toArray();
  const orphanRequestIds = allRequests
    .filter((r) => !allGroupIds.has(r.groupId.toString()) || !allUserIds.has(r.userId.toString()))
    .map((r) => r._id);
  if (orphanRequestIds.length > 0) {
    const r = await db.collection("joinrequests").deleteMany({ _id: { $in: orphanRequestIds } });
    console.log(`Deleted ${r.deletedCount} orphaned join requests`);
  } else {
    console.log("No orphaned join requests");
  }

  // Orphaned group invites
  const allInvites = await db.collection("groupinvites").find({}).toArray();
  const orphanInviteIds = allInvites
    .filter((i) => !allGroupIds.has(i.groupId.toString()))
    .map((i) => i._id);
  if (orphanInviteIds.length > 0) {
    const r = await db.collection("groupinvites").deleteMany({ _id: { $in: orphanInviteIds } });
    console.log(`Deleted ${r.deletedCount} orphaned group invites`);
  } else {
    console.log("No orphaned group invites");
  }

  // Orphaned moderation logs
  const allModLogs = await db.collection("moderationlogs").find({}).toArray();
  const orphanModIds = allModLogs
    .filter((l) => !allGroupIds.has(l.groupId.toString()))
    .map((l) => l._id);
  if (orphanModIds.length > 0) {
    const r = await db.collection("moderationlogs").deleteMany({ _id: { $in: orphanModIds } });
    console.log(`Deleted ${r.deletedCount} orphaned moderation logs`);
  } else {
    console.log("No orphaned moderation logs");
  }

  await client.close();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
