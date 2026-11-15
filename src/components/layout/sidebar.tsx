"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, PASTOR_NAV } from "@/lib/nav";
import type { Role } from "@/lib/utils";

export function Sidebar({ role, isPastor }: { role: Role; isPastor?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
      <nav className="flex flex-col gap-1 p-4 pt-6">
        {[...NAV[role], ...(isPastor ? [PASTOR_NAV] : [])].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
