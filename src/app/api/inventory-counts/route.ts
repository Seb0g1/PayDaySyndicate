import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const countSchema = z.object({
  name: z.string().min(1),
  date: z.string(),
  data: z.any(), // JSON с данными товаров
  status: z.enum(["DRAFT", "SAVED"]).default("DRAFT"),
});

export async function GET() {
  // Не требуем авторизацию для чтения, но могли бы добавить
  try {
    const counts = await prisma.inventoryCountHistory.findMany({ 
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(counts);
  } catch (error: any) {
    console.error("GET inventory-counts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;

    const body = await req.json();
    const parsed = countSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const created = await prisma.inventoryCountHistory.create({
      data: {
        name: parsed.data.name,
        date: new Date(parsed.data.date),
        data: parsed.data.data,
        status: parsed.data.status,
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error("POST inventory-counts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

