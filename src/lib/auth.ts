import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "./schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const raw = String(credentials.email).trim();
        const phone = raw.replace(/[\s\-().]/g, "");
        const [user] = await db
          .select()
          .from(users)
          .where(or(eq(users.email, raw.toLowerCase()), eq(users.phone, phone)));
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        Object.assign(session.user, { role: token.role, id: token.id, iat: token.iat });
      }
      return session;
    },
  },
});
