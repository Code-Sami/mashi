import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { fullName, issueMobileToken } from "@/lib/mobile-api";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

function toBaseUsername(displayName: string, email: string) {
  const fromName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  if (fromName.length >= 3) return fromName;
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "user";
}

async function generateUniqueUsername(displayName: string, email: string) {
  const base = toBaseUsername(displayName, email);
  let candidate = base;
  let count = 1;
  while (await UserModel.exists({ username: candidate })) {
    candidate = `${base}${count}`;
    count += 1;
  }
  return candidate;
}

export async function POST(request: NextRequest) {
  let body: { firstName?: string; lastName?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const firstName = body.firstName?.toString().trim() || "";
  const lastName = body.lastName?.toString().trim() || "";
  const email = body.email?.toString().trim().toLowerCase() || "";
  const password = body.password?.toString() || "";
  if (!firstName || !lastName || !email || password.length < 8) {
    return NextResponse.json(
      { error: "First name, last name, valid email, and password (min 8 chars) are required." },
      { status: 400 },
    );
  }

  await connectToDatabase();
  const existingByEmail = await UserModel.findOne({ email }).lean();
  if (existingByEmail?.passwordHash) {
    return NextResponse.json({ error: "Email is already in use." }, { status: 409 });
  }

  const displayName = `${firstName} ${lastName}`.trim();
  const username = await generateUniqueUsername(displayName, email);
  const passwordHash = await hash(password, 10);

  const user = existingByEmail
    ? await UserModel.findByIdAndUpdate(
        existingByEmail._id,
        {
          $set: {
            name: displayName,
            firstName,
            lastName,
            displayName,
            username,
            passwordHash,
            updatedAt: new Date(),
          },
        },
        { new: true },
      ).lean()
    : await UserModel.create({
        name: displayName,
        firstName,
        lastName,
        username,
        displayName,
        email,
        passwordHash,
        avatarUrl: "",
      });

  const userId = user?._id?.toString();
  if (!userId) {
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }

  const token = issueMobileToken(userId);
  return NextResponse.json({
    token,
    user: {
      id: userId,
      displayName: fullName(user),
      username: user.username || null,
      avatarURL: user.avatarUrl || null,
    },
  });
}
