import type { DefaultSession } from "next-auth";

/**
 * Module augmentation: expose `id` and `role` on the session user so
 * server-side authorization can read them with full type safety.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
