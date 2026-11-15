import { Navbar } from "@/components/layout/navbar";
import { JoinForm } from "@/components/forms/join-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUser } from "@/lib/session";
import { getOfficeWhatsapp } from "@/lib/progress";
import { waLink } from "@/lib/phone";
import { MessageCircle } from "lucide-react";

export default async function JoinPage() {
  const user = await getUser();
  const chat = waLink(await getOfficeWhatsapp(), "Hello, I'd like to join the next class.");
  return (
    <>
      <Navbar user={user ?? undefined} />
      <main className="mx-auto max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Join the next class</CardTitle>
            <CardDescription>Tell us a little about yourself. An admin will review your request and set up your account.</CardDescription>
          </CardHeader>
          <CardContent><JoinForm /></CardContent>
        </Card>
        {chat && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Prefer to chat?{" "}
            <a href={chat} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"><MessageCircle className="h-4 w-4" />Chat with us on WhatsApp</a>
          </p>
        )}
      </main>
    </>
  );
}
