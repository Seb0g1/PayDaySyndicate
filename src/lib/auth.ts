import NextAuth, { getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

export const authConfig: any = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({ username: z.string().min(1), password: z.string().min(6) })
          .safeParse(credentials);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;

        const user = await prisma.user.findFirst({ where: { name: username } });
        if (!user || !user.password) return null;
        const ok = await compare(password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined, image: user.image ?? undefined, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        // Persist role on token
        const dbUser = await prisma.user.findUnique({ where: { id: (user as any).id } });
        token.role = dbUser?.role ?? "EMPLOYEE";
      }
      if (account && account.provider === "google") {
        // Ensure role exists for google users
        const dbUser = await prisma.user.findUnique({ where: { email: token.email ?? undefined } });
        if (dbUser && !dbUser.role) {
          await prisma.user.update({ where: { id: dbUser.id }, data: { role: "EMPLOYEE" } });
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  trustHost: true,
};

export async function getAuth() {
  // next-auth v4 getServerSession with options
  return getServerSession(authConfig);
}


