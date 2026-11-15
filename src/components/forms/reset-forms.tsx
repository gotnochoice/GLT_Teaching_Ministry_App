"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, MessageCircle } from "lucide-react";
import { generateResetLink, requestReset, resetPassword, type ForgotState, type LinkState, type ResetState } from "@/lib/actions/password";
import { waLink } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function ForgotForm({ emailConnected }: { emailConnected: boolean }) {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, {});
  if (state.ok) {
    return (
      <div className="rounded-lg bg-green-50 p-5 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
        <p className="font-semibold text-gray-900">Request received</p>
        <p className="mt-1 text-sm text-gray-600">
          {emailConnected
            ? "If that email or phone number belongs to an account, a reset link is on its way. Check your inbox and spam folder. The link works once and expires in 1 hour."
            : "If that email or phone number belongs to an account, the church office has been notified and will send you a reset link (usually on WhatsApp)."}
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div aria-hidden className="absolute left-[-9999px]"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="space-y-1.5">
        <Label htmlFor="identifier">Email or phone number</Label>
        <Input id="identifier" name="identifier" required maxLength={200} autoComplete="username" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending..." : "Send reset request"}</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  if (state.ok) {
    return (
      <div className="rounded-lg bg-green-50 p-5 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
        <p className="font-semibold text-gray-900">Password changed</p>
        <p className="mt-1 text-sm text-gray-600">You can now sign in with your new password.</p>
        <Link href="/login" className="mt-4 inline-block"><Button>Go to sign in</Button></Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5"><Label htmlFor="next">New password (at least 8 characters)</Label><PasswordInput id="next" name="next" required minLength={8} autoComplete="new-password" /></div>
      <div className="space-y-1.5"><Label htmlFor="confirm">Confirm new password</Label><PasswordInput id="confirm" name="confirm" required minLength={8} autoComplete="new-password" /></div>
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving..." : "Set new password"}</Button>
    </form>
  );
}

/** Admin: make a one-time reset link for one person, copy it or send it on WhatsApp. */
export function ResetLinkForm({ userId, label = "Make reset link" }: { userId: string; label?: string }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(generateResetLink, {});
  const [copied, setCopied] = useState(false);
  if (state.ok && state.url) {
    const wa = waLink(state.phone, `Hello ${state.name?.split(" ")[0]}, here is your password reset link (valid for ${state.hours} hours, works once):\n${state.url}`);
    return (
      <div className="w-full space-y-2 rounded-md bg-green-50 p-3 text-sm">
        <p className="font-semibold text-green-800">Reset link for {state.name}</p>
        <input readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border border-green-200 bg-white px-2 py-1.5 font-mono text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="button" variant="outline" onClick={() => { navigator.clipboard?.writeText(state.url!); setCopied(true); }}><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy link"}</Button>
          {wa ? <a href={wa} target="_blank" rel="noreferrer"><Button size="sm" type="button"><MessageCircle className="h-4 w-4" />Send on WhatsApp</Button></a> : <span className="self-center text-xs text-gray-500">No phone number on file, so copy the link and send it another way.</span>}
        </div>
        <p className="text-xs text-gray-500">Shown once. It expires in {state.hours} hours and works once. Making another link cancels this one.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Button size="sm" type="submit" disabled={pending}>{pending ? "Making link..." : label}</Button>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
