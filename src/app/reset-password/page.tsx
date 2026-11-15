import Image from "next/image";
import Link from "next/link";
import { ResetForm } from "@/components/forms/reset-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { findValidReset } from "@/lib/password-reset";
import { APP_NAME } from "@/lib/utils";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = !!(await findValidReset(token));
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo.jpg" alt="GLT" width={40} height={40} className="h-10 w-10 rounded-full object-cover" priority />
            <span className="text-lg font-bold leading-tight text-brand sm:text-xl">{APP_NAME}</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{valid ? "Choose a new password" : "This link has expired"}</CardTitle>
            <CardDescription>{valid ? "Pick a password you have not used elsewhere." : "Reset links work once and expire after a while."}</CardDescription>
          </CardHeader>
          <CardContent>
            {valid ? <ResetForm token={token!} /> : <Link href="/forgot-password"><Button className="w-full">Ask for a new link</Button></Link>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
