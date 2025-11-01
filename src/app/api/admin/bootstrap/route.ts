import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SETUP_SECRET;
  if (!secret) return new NextResponse("ADMIN_SETUP_SECRET not set", { status: 500 });
  const provided = req.headers.get("x-setup-secret");
  if (provided !== secret) return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = body.name ?? "Admin";
  const email = String(body.email || "").toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return new NextResponse("email and password required", { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // ensure ADMIN
    await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    return NextResponse.json({ ok: true, updated: true });
  }

  const passwordHash = await hash(password, 10);
  await prisma.user.create({ data: { name, email, password: passwordHash, role: "ADMIN" } });
  return NextResponse.json({ ok: true, created: true });
}


