import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AIChatClient } from "@/components/ai-chat-client";
import type { UserRole } from "@/lib/rbac";

const isLocalMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let role: UserRole = "admin"; // default for local mode
  let userEmail: string | null = null;

  if (!isLocalMode) {
    const { requireAuth } = await import("@/lib/auth");
    await requireAuth();
    const { getUserRole } = await import("@/lib/rbac");
    const { createClient } = await import("@/lib/supabase/server");
    role = await getUserRole();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar role={role} userEmail={userEmail} />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
      <MobileNav role={role} />
      <AIChatClient />
    </div>
  );
}
