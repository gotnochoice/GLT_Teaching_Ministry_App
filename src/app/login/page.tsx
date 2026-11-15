import { LoginForm } from "@/components/forms/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return <LoginForm expired={expired === "1"} />;
}
