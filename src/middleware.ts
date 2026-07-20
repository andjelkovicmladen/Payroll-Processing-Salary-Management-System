import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Edge middleware: redirects unauthenticated users away from /dashboard.
 * Uses the edge-safe half of the auth config (no Prisma/bcrypt).
 * Real authorization (roles) is enforced server-side in every action/handler.
 */
export default NextAuth(authConfig).auth;

export const config = {
  // Protect everything except static assets and auth API routes.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
