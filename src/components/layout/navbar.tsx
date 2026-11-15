"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV, PASTOR_NAV } from "@/lib/nav";
import { APP_NAME, APP_SHORT_NAME, cn, dashboardPath, type Role } from "@/lib/utils";

export function Navbar({ user }: { user?: { name: string; role: Role; isPastor?: boolean } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = user ? [...NAV[user.role], ...(user.isPastor ? [PASTOR_NAV] : [])] : [];
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white print:hidden">
        <div className="flex h-14 w-full items-center justify-between px-6">
          <Link href={user ? dashboardPath(user.role) : "/"} className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.jpg" alt="GLT" width={32} height={32} className="h-8 w-8 rounded-full object-cover" priority />
            <span className="text-base font-bold tracking-tight text-brand"><span className="hidden md:inline">{APP_NAME}</span><span className="md:hidden">{APP_SHORT_NAME}</span></span>
          </Link>

          {user ? (
            <>
              <div className="hidden items-center gap-1 lg:flex">
                <div className="flex items-center gap-2.5 px-3 py-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{firstName}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">{user.role.toLowerCase()}</span>
                </div>
                <div className="mx-1 h-5 w-px bg-gray-200" />
                <Link href="/account" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">Account</Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
          )}
        </div>
      </nav>

      {open && user && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs capitalize text-gray-400">{user.role.toLowerCase()}</p>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-0.5">
                {nav.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === href ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" /> {label}
                  </Link>
                ))}
              </div>
            </nav>
            <div className="border-t border-gray-100 p-3">
              <Link href="/account" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Account &amp; notifications</Link>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
