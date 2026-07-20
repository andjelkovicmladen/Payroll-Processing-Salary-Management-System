import { auth } from "./auth";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";

/**
 * Server-side authorization guards.
 *
 * Every Server Action and Route Handler calls one of these BEFORE touching the
 * service layer — middleware only handles redirects; real enforcement is here.
 *
 * Role model:
 *   ADMIN  ⊃ HR ⊃ VIEWER  (simple hierarchy, see `roleRank`)
 */
export type Role = "ADMIN" | "HR" | "VIEWER";

const roleRank: Record<Role, number> = {
  VIEWER: 0,
  HR: 1,
  ADMIN: 2,
};

export interface SessionUser {
  id: string;
  role: Role;
  email?: string | null;
  name?: string | null;
}

/** Returns the authenticated user or throws 401. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new AuthenticationError();
  return {
    id: user.id,
    role: (user.role as Role) ?? "VIEWER",
    email: user.email,
    name: user.name,
  };
}

/** Returns the user if their role is at least `minimum`, else throws 403. */
export async function requireRole(minimum: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (roleRank[user.role] < roleRank[minimum]) {
    throw new AuthorizationError(
      `This action requires the ${minimum} role`,
    );
  }
  return user;
}
