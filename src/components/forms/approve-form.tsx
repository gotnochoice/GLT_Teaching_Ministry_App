"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { waLink } from "@/lib/phone";
import { approveApplication, type ApproveState } from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";

export function ApproveForm({ id, cohorts }: { id: string; cohorts: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ApproveState, FormData>(approveApplication, {});
  const router = useRouter();
  if (state.ok) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const wa = waLink(state.phone, `Hello ${state.name}, your request to join has been approved.\n\nLogin: ${site}/login\nEmail: ${state.email}\nTemporary password: ${state.password}\n\nYou will be asked to choose a new password the first time you log in.`);
    return (
      <div className="rounded-md bg-green-50 p-3 text-sm">
        <p className="font-semibold text-green-800">Account created for {state.email}</p>
        <p>Temporary password: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{state.password}</code></p>
        <p className="mt-1 text-xs text-gray-600">
          Shown once. Email: {state.emailed === "sent" ? "sent" : "not sent (email isn't set up or failed)"}.
          {wa ? " Use the WhatsApp button to send them their details." : " Give these details to the student yourself."} They must choose a new password at first login.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {wa && <a href={wa} target="_blank" rel="noreferrer"><Button size="sm" type="button">Send on WhatsApp</Button></a>}
          <Button size="sm" variant="outline" onClick={() => router.refresh()}>Done, I have saved it</Button>
        </div>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="cohortId" className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm">
        <option value="">No cohort yet</option>
        {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button size="sm" type="submit" disabled={pending}>{pending ? "Creating..." : "Approve & create account"}</Button>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
