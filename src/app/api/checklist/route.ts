import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const checklistItemSchema = z.object({
  text: z.string().min(1),
  order: z.number().int(),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  const items = await prisma.checklistItem.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = checklistItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { text, order, isActive } = parsed.data;

  const item = await prisma.checklistItem.create({
    data: {
      text,
      order,
      isActive: isActive ?? true,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: Request) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  const body = await req.json();
  const items = z.array(z.object({
    id: z.string().optional(),
    text: z.string().min(1),
    order: z.number().int(),
    isActive: z.boolean().optional().default(true),
  })).parse(body);

  // Удаляем все старые элементы
  await prisma.checklistItem.deleteMany({});

  // Создаем новые элементы
  const created = await prisma.checklistItem.createMany({
    data: items.map((item, index) => ({
      text: item.text,
      order: item.order !== undefined ? item.order : index,
      isActive: item.isActive ?? true,
    })),
  });

  // Получаем все созданные элементы
  const allItems = await prisma.checklistItem.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json(allItems);
}


