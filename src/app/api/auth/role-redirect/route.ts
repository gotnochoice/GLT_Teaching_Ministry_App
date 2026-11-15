import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dashboardPath } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return NextResponse.redirect(new URL(role ? dashboardPath(role) : "/login", req.url));
}
