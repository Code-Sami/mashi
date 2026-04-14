import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export const authOptions: NextAuthOptions = {
  // Use a stable secret in development to avoid JWT decryption failures after restarts.
  secret: process.env.NEXTAUTH_SECRET || "mashi-dev-insecure-secret-change-me",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        if (!email || !password) return null;

        await connectToDatabase();
        const user = await UserModel.findOne({ email }).lean();
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.displayName || user.name,
          email: user.email,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.username = (user as { username?: string }).username || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.username = (token.username as string) || "";
      }
      return session;
    },
  },
};
