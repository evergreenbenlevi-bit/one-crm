import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

const isLocalMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isLocalMode) {
    const { requireAuth } = await import("@/lib/auth");
    await requireAuth();
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
