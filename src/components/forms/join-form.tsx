"use client";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitApplication, type JoinState } from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function JoinForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(submitApplication, {});
  if (state.ok) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
        <p className="font-semibold text-gray-900">Request received</p>
        <p className="mt-1 text-sm text-gray-600">Thank you. The church office will review it and contact you with your login details once you are placed in a class.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      {/* honeypot: hidden from people, bots fill it */}
      <div aria-hidden className="absolute left-[-9999px]"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" name="name" required maxLength={100} /></div>
      <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required maxLength={200} /></div>
      <div className="space-y-1.5"><Label htmlFor="phone">Phone / WhatsApp (optional)</Label><Input id="phone" name="phone" maxLength={30} placeholder="e.g. 0803 000 0000 or +44…" /></div>
      <div className="space-y-1.5"><Label htmlFor="location">City / GLT branch you attend</Label><Input id="location" name="location" maxLength={100} /></div>
      <div className="space-y-1.5">
        <Label htmlFor="preferredMode">How will you attend?</Label>
        <select id="preferredMode" name="preferredMode" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"><option value="in-person">In person (Sundays)</option><option value="online">Online</option></select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="message">Anything we should know? (optional)</Label><Textarea id="message" name="message" rows={3} maxLength={1000} /></div>
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending..." : "Send request"}</Button>
    </form>
  );
}
