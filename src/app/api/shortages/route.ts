import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const items = await prisma.shortage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

const schema = z.object({
  productNameSystem: z.string().min(1),
  productNameActual: z.string().optional(),
  countSystem: z.number().int().nonnegative(),
  countActual: z.number().int().nonnegative(),
  price: z.number().positive(),
  suggestedReplacement: z.any().optional(),
  assignedToEmployeeId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;
  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data as any;
  if (role === "ADMIN") {
    // Администратор может создавать только личный минус — нужен связанный сотрудник
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.employeeId) return new NextResponse("Forbidden", { status: 403 });
    data.assignedToEmployeeId = user.employeeId;
  } else {
    // Для остальных ролей, кроме директора, запретим полностью
    const directorForbidden = await requireDirector();
    if (directorForbidden) return directorForbidden;
  }
  const created = await prisma.shortage.create({ data });
  return NextResponse.json(created, { status: 201 });
}


