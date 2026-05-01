import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { fullName, issueMobileToken } from "@/lib/mobile-api";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.toString().trim().toLowerCase();
  const password = body.password?.toString();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ email }).lean();
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = issueMobileToken(user._id.toString());
  return NextResponse.json({
    token,
    user: {
      id: user._id.toString(),
      displayName: fullName(user),
      username: user.username || null,
      avatarURL: user.avatarUrl || null,
    },
  });
}
