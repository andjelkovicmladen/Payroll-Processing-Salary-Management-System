"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

export interface LoginState {
  error?: string;
}

/**
 * Credentials login action (used with useActionState).
 * Rate-limited per submitted email to slow down brute-force attempts.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase();

  try {
    assertRateLimit(`login:${email}`, { limit: 5, windowMs: 60_000 });
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: "Too many attempts. Please wait a minute." };
    }
    if (error instanceof AuthError) {
      return error.type === "CredentialsSignin"
        ? { error: "Invalid email or password." }
        : { error: "Unable to sign in. Please try again." };
    }
    // NEXT_REDIRECT etc. must propagate for the redirect to happen.
    throw error;
  }
}
