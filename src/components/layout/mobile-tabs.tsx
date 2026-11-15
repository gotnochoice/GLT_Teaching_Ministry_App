"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn, type Role } from "@/lib/utils";

/** Short labels for the phone's bottom bar; icons come from the main nav. Everything else is under "More". */
const TABS: Record<Role, { href: string; label: string }[]> = {
  STUDENT: [
    { href: "/dashboard/student", label: "Home" },
    { href: "/dashboard/student/classes", label: "Classes" },
    { href: "/dashboard/student/schedule", label: "Attendance" },
    { href: "/dashboard/student/results", label: "Results" },
  ],
  TEACHER: [
    { href: "/dashboard/teacher", label: "Home" },
    { href: "/dashboard/teacher/students", label: "Students" },
    { href: "/dashboard/teacher/grading", label: "Grading" },
    { href: "/dashboard/teacher/sessions", label: "Sessions" },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Home" },
    { href: "/dashboard/admin/applications", label: "Requests" },
    { href: "/dashboard/admin/students", label: "Students" },
    { href: "/dashboard/admin/grading", label: "Grading" },
  ],
};

export function MobileTabs({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden">
      <ul className="grid grid-cols-5">
        {TABS[role].map(({ href, label }) => {
          const Icon = NAV[role].find((n) => n.href === href)?.icon;
          const active = pathname === href;
          return (
            <li key={href}>
              <Link href={href} className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-brand" : "text-gray-500")}>
                {Icon && <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />}
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => window.dispatchEvent(new Event("open-menu"))} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-gray-500">
            <Menu className="h-5 w-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
