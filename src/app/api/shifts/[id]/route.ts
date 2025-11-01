import { prisma } from "@/lib/prisma";
import { requireShiftManager } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireShiftManager();
  if (forbidden) return forbidden;
  const body = await req.json();
  const schema = z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    attended: z.boolean().optional(),
    status: z.enum(["UNMARKED", "ATTENDED", "ABSENT", "LATE"]).optional(),
    type: z.enum(["MORNING", "EVENING", "NIGHT", "CUSTOM"]).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: any = parsed.data;
  const { id } = await ctx.params;
  if (data.startTime || data.endTime) {
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    const start = data.startTime ? new Date(data.startTime) : existing.startTime;
    const end = data.endTime ? new Date(data.endTime) : existing.endTime;
    data.hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }
  const updated = await prisma.shift.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireShiftManager();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  await prisma.shift.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}


