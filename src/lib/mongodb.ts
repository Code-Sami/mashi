import "server-only";
import dns from "node:dns";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "Mashi";

dns.setDefaultResultOrder("ipv4first");

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment variables.");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  _mashiMongoose?: MongooseCache;
};

const cached = globalForMongoose._mashiMongoose ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose._mashiMongoose) {
  globalForMongoose._mashiMongoose = cached;
}

export async function connectToDatabase() {
  try {
    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      cached.promise = mongoose.connect(MONGODB_URI!, {
        dbName: MONGODB_DB,
        bufferCommands: false,
      });
    }

    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
