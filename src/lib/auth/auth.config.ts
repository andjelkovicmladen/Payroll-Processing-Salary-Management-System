import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration.
 *
 * This half contains NO Node-only dependencies (no Prisma, no bcrypt) so it can
 * run in the Edge middleware. The full config with the Credentials provider
 * lives in `auth.ts`. Route protection logic lives in `authorized`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Persist role + id onto the JWT and expose them on the session.
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "VIEWER";
        token.id = user.id as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    // Gate the /dashboard app segment; redirect unauthenticated users to login.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnApp = nextUrl.pathname.startsWith("/dashboard");
      if (isOnApp) return isLoggedIn;
      return true;
    },
  },
  providers: [], // real providers are attached in auth.ts (Node runtime)
} satisfies NextAuthConfig;
