import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username?: string;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      username: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    username?: string;
  }
}
