import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    return NextResponse.json({ ok: true, message: "MongoDB connection succeeded." });
  } catch (error) {
    const e = error as {
      message?: string;
      code?: string;
      hostname?: string;
      syscall?: string;
      name?: string;
    };

    return NextResponse.json(
      {
        ok: false,
        message: e.message || "MongoDB connection failed.",
        code: e.code || null,
        hostname: e.hostname || null,
        syscall: e.syscall || null,
        name: e.name || "Error",
      },
      { status: 500 }
    );
  }
}
