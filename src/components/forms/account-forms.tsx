"use client";
import Link from "next/link";
import { useActionState } from "react";
import { changePassword, type AccountState } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="current">{forced ? "Temporary password" : "Current password"}</Label><PasswordInput id="current" name="current" required /></div>
      <div className="space-y-1.5"><Label htmlFor="next">New password (min 8 characters)</Label><PasswordInput id="next" name="next" required minLength={8} /></div>
      <div className="space-y-1.5"><Label htmlFor="confirm">Confirm new password</Label><PasswordInput id="confirm" name="confirm" required minLength={8} /></div>
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password changed. <Link prefetch={false} className="font-semibold underline" href="/api/auth/role-redirect">Continue to your dashboard</Link></p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Change password"}</Button>
    </form>
  );
}
