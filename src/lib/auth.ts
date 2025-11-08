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
        try {
          const parsed = z
            .object({ username: z.string().min(1), password: z.string().min(6) })
            .safeParse(credentials);
          if (!parsed.success) return null;
          const { username, password } = parsed.data;

          // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
          const users = await prisma.$queryRaw`
            SELECT id, name, email, password, role, image FROM "User" WHERE name = ${username} LIMIT 1;
          ` as any[];

          if (!users || users.length === 0) return null;
          const user = users[0];
          
          if (!user || !user.password) return null;
          const ok = await compare(password, user.password);
          if (!ok) return null;
          
          return { 
            id: user.id, 
            email: user.email ?? undefined, 
            name: user.name ?? undefined, 
            image: user.image ?? undefined, 
            role: user.role 
          } as any;
        } catch (error: any) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      try {
        if (user) {
          // Persist role on token
          const users = await prisma.$queryRaw`
            SELECT id, role FROM "User" WHERE id = ${(user as any).id} LIMIT 1;
          ` as any[];
          
          if (users && users.length > 0) {
            token.role = users[0].role ?? "EMPLOYEE";
          } else {
            token.role = (user as any).role ?? "EMPLOYEE";
          }
        }
        if (account && account.provider === "google") {
          // Ensure role exists for google users
          const users = await prisma.$queryRaw`
            SELECT id, role FROM "User" WHERE email = ${token.email ?? ''} LIMIT 1;
          ` as any[];
          
          if (users && users.length > 0) {
            const dbUser = users[0];
            if (!dbUser.role) {
              await prisma.$executeRaw`
                UPDATE "User" SET role = 'EMPLOYEE'::"UserRole" WHERE id = ${dbUser.id};
              `;
            }
          }
        }
      } catch (error: any) {
        console.error("JWT callback error:", error);
        token.role = (user as any)?.role ?? "EMPLOYEE";
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


