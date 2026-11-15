import { NextResponse } from "next/server";

/**
 * Reached when someone still holds a login cookie that is no longer valid (their password was reset, or the
 * account was removed). Clears the cookie, then sends them to sign in. Without this the sign-in page would
 * bounce them straight back into the dashboard because the cookie still looks like a login.
 */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.url));
  for (const [name, secure] of [["authjs.session-token", false], ["__Secure-authjs.session-token", true]] as const) {
    res.cookies.set({ name, value: "", path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure });
  }
  return res;
}
