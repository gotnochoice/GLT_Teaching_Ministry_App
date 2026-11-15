import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabs } from "@/components/layout/mobile-tabs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/api/auth/clear-session");
  if (user.mustChangePassword) redirect("/account?force=1");
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} />
      <div className="flex flex-1">
        <Sidebar role={user.role} isPastor={user.isPastor} />
        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileTabs role={user.role} />
    </div>
  );
}
