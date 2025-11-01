import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  if (process.env.ALLOW_REGISTRATION !== "true" && process.env.NEXT_PUBLIC_ALLOW_REGISTRATION !== "true") {
    return new NextResponse("Registration disabled", { status: 403 });
  }

  const body = await req.json();
  const schema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return new NextResponse("Email already in use", { status: 400 });

  const passwordHash = await hash(password, 10);

  const numUsers = await prisma.user.count();
  const role = numUsers === 0 ? "ADMIN" : "EMPLOYEE";

  await prisma.user.create({ data: { name, email, password: passwordHash, role } });
  return NextResponse.json({ ok: true });
}


