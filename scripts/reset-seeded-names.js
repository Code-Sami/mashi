/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

function readEnvValue(key) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return undefined;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const match = lines.find((line) => line.startsWith(`${key}=`));
  if (!match) return undefined;
  return match.slice(key.length + 1).trim();
}

async function main() {
  const uri = process.env.MONGODB_URI || readEnvValue("MONGODB_URI");
  const dbName = process.env.MONGODB_DB || readEnvValue("MONGODB_DB") || "Mashi";

  if (!uri) {
    throw new Error("Missing MONGODB_URI (env or .env.local).");
  }

  await mongoose.connect(uri, { dbName });

  const users = mongoose.connection.db.collection("users");
  const updates = [
    { email: "sam@mashi.app", firstName: "Sam", lastName: "Karim" },
    { email: "maya@mashi.app", firstName: "Maya", lastName: "Lee" },
    { email: "jordan@mashi.app", firstName: "Jordan", lastName: "Park" },
    { email: "alex@mashi.app", firstName: "Alex", lastName: "Moore" },
  ];

  for (const update of updates) {
    const fullName = `${update.firstName} ${update.lastName}`;
    const result = await users.updateOne(
      { email: update.email },
      {
        $set: {
          firstName: update.firstName,
          lastName: update.lastName,
          displayName: fullName,
          name: fullName,
          updatedAt: new Date(),
        },
      }
    );
    console.log(
      `${update.email}: matched=${result.matchedCount}, modified=${result.modifiedCount}`
    );
  }

  await mongoose.disconnect();
  console.log("Seeded user name reset complete.");
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
