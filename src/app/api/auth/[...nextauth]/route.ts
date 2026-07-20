import { handlers } from "@/lib/auth/auth";

/**
 * Auth.js catch-all endpoints (/api/auth/session, /csrf, /signout, …).
 * Sign-in/out in the UI use server actions directly; these handlers serve the
 * standard Auth.js client protocol and future OAuth providers.
 */
export const { GET, POST } = handlers;
