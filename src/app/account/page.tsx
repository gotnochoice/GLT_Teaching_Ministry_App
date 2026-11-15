import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getUser } from "@/lib/session";
import { savePreferences } from "@/lib/actions/account";
import { providerStatus } from "@/lib/notify";
import { Navbar } from "@/components/layout/navbar";
import { ChangePasswordForm } from "@/components/forms/account-forms";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ force?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { force } = await searchParams;
  const forced = user.mustChangePassword;
  const [u] = await db.select().from(users).where(eq(users.id, user.id));
  const p = providerStatus();
  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <h1 className="font-display text-3xl uppercase tracking-wide text-ink">My account</h1>
        {(forced || force) && <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">Please choose a new password before continuing. Your temporary password was shared with you by the church office.</p>}
        <Card>
          <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
          <CardContent><ChangePasswordForm forced={forced} /></CardContent>
        </Card>
        {!forced && (
          <Card>
            <CardHeader><CardTitle className="text-base">Reminders</CardTitle><CardDescription>Class and due-date reminders are sent by email.</CardDescription></CardHeader>
            <CardContent>
              <form action={savePreferences} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="phone">WhatsApp / phone number</Label><Input id="phone" name="phone" defaultValue={u?.phone ?? ""} placeholder="+234…" /><p className="text-xs text-gray-500">Your teachers and the church office can message you on WhatsApp with this number.</p></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyEmail" defaultChecked={u?.notifyEmail} /> Email reminders{!p.email && <span className="text-xs text-gray-400">(not enabled yet)</span>}</label>
                <Button type="submit">Save</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
