import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function requireAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).lean();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Session user doc, or null (no redirect). Use for pages that must work for link previews / logged-out visitors. */
export async function getAuthUserOrNull() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).lean();
  return user || null;
}
