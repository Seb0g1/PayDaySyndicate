import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().optional(),
  data: z.any().optional(),
  status: z.string().optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Не требуем авторизацию для чтения
    const { id } = await ctx.params;
    const count = await prisma.inventoryCountHistory.findUnique({ where: { id } });
    if (!count) return new NextResponse("Not found", { status: 404 });
    return NextResponse.json(count);
  } catch (error: any) {
    console.error("GET inventory-counts/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date);
    if (parsed.data.data !== undefined) updateData.data = parsed.data.data;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    
    const updated = await prisma.inventoryCountHistory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH inventory-counts/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;

    const { id } = await ctx.params;
    await prisma.inventoryCountHistory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("DELETE inventory-counts/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

