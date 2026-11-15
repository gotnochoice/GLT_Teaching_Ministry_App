import { Navbar } from "@/components/layout/navbar";
import { JoinForm } from "@/components/forms/join-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUser } from "@/lib/session";

export default async function JoinPage() {
  const user = await getUser();
  return (
    <>
      <Navbar user={user ?? undefined} />
      <main className="mx-auto max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl uppercase tracking-wide">Join the next class</CardTitle>
            <CardDescription>Tell us a little about yourself. An admin will review your request and set up your account.</CardDescription>
          </CardHeader>
          <CardContent><JoinForm /></CardContent>
        </Card>
      </main>
    </>
  );
}
