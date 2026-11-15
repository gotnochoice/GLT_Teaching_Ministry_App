import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ForgotForm } from "@/components/forms/reset-forms";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getOfficeWhatsapp } from "@/lib/progress";
import { providerStatus } from "@/lib/notify";
import { waLink } from "@/lib/phone";
import { APP_NAME } from "@/lib/utils";

export default async function ForgotPasswordPage() {
  const chat = waLink(await getOfficeWhatsapp(), "Hello, I forgot my password and need a reset link.");
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
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>Enter the email or phone number on your account and we will help you set a new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotForm emailConnected={providerStatus().email} />
            {chat && (
              <p className="mt-4 text-center text-sm text-gray-600">
                Need help faster?{" "}
                <a href={chat} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline"><MessageCircle className="h-4 w-4" />Message the church office</a>
              </p>
            )}
            <p className="mt-4 text-center text-sm text-gray-500"><Link href="/login" className="font-medium text-brand hover:underline">Back to sign in</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
