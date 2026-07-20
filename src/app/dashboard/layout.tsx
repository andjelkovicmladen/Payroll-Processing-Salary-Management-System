import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { auth, signOut } from "@/lib/auth/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";

/**
 * Authenticated application shell: fixed sidebar (desktop), top bar with the
 * user menu, and the routed page content. Auth is double-checked here on the
 * server in addition to the edge middleware.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="h-4 w-4" />
          </div>
          <span className="font-semibold">PayrollPro</span>
        </div>
        <div className="flex-1 py-4">
          <SidebarNav />
        </div>
        <div className="border-t p-4 text-xs text-muted-foreground">
          Payroll & Salary Management
          <br />v1.0 — internal demo
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="h-4 w-4" />
            </div>
            <span className="font-semibold">PayrollPro</span>
          </div>
          <div className="hidden md:block" />
          <UserMenu
            name={session.user.name ?? "User"}
            email={session.user.email ?? ""}
            role={session.user.role}
            signOutAction={handleSignOut}
          />
        </header>

        {/* Mobile nav */}
        <div className="border-b bg-card px-2 py-2 md:hidden">
          <SidebarNav />
        </div>

        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
