import "server-only";
import { ensureLlmArena } from "@/lib/llm-arena";
import { connectToDatabase } from "@/lib/mongodb";
import { hash } from "bcryptjs";
import { UserModel } from "@/models/User";

let hasSeeded = false;

function splitLegacyName(name: string | undefined, email: string | undefined) {
  const raw = (name || "").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Member";
  const fallbackLast = (email || "user@example.com").split("@")[0] || "User";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : fallbackLast;
  return { firstName, lastName };
}

function inferUsername(email: string, name: string, fallback: string) {
  const fromEmail = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (fromEmail) return fromEmail;
  const fromName = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (fromName) return fromName;
  return fallback;
}

export async function ensureSeedData() {
  if (hasSeeded) {
    return;
  }

  await connectToDatabase();
  const defaultHash = await hash("password123", 10);

  // Migrate legacy users to the new firstName/lastName schema.
  const legacyUsers = await UserModel.find({
    $or: [{ firstName: { $exists: false } }, { lastName: { $exists: false } }, { displayName: { $exists: false } }],
  });
  for (const legacy of legacyUsers) {
    const { firstName, lastName } = splitLegacyName(legacy.name, legacy.email);
    legacy.firstName = legacy.firstName || firstName;
    legacy.lastName = legacy.lastName || lastName;
    legacy.displayName = legacy.displayName || `${legacy.firstName} ${legacy.lastName}`.trim();
    legacy.name = legacy.name || legacy.displayName;
    legacy.username =
      legacy.username || inferUsername(legacy.email, legacy.displayName, `user${legacy._id.toString().slice(-6)}`);
    legacy.passwordHash = legacy.passwordHash || defaultHash;
    await legacy.save();
  }

  // Backfill visibility on groups created before the field existed.
  const conn = await connectToDatabase();
  await conn.connection.db!.collection("groups").updateMany(
    { visibility: { $exists: false } },
    { $set: { visibility: "public" } }
  );

  await ensureLlmArena();

  hasSeeded = true;
}
