"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "GLT Life Foundation Bible School";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      // "CredentialsSignin" = the details did not match. Anything else is a server/database problem.
      setError(
        result.error === "CredentialsSignin"
          ? "Wrong email, phone number, or password. Try again."
          : "We could not sign you in because of a problem on our side (not your password). Please try again shortly or tell the church office."
      );
      setLoading(false);
      return;
    }
    window.location.href = "/api/auth/role-redirect";
  }

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
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Log in with the details your church admin gave you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email or phone number</Label>
                <Input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logging in..." : "Sign in"}</Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              New here? <Link href="/join" className="font-medium text-brand hover:underline">Request to join the next class</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
