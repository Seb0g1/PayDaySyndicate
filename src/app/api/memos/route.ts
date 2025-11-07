import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

const memoSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  images: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

  const where: any = {};

  // Для сотрудников показываем только опубликованные памятки
  if (role !== "DIRECTOR") {
    where.isPublished = true;
  }

  const memos = await prisma.memo.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(memos);
}

export async function POST(req: Request) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  const session = await getAuth();
  const userId = (((session as any)?.user as any)?.id ?? "") as string;

  const formData = await req.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const isPublished = formData.get("isPublished") === "true";

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const files = formData.getAll("images") as File[];
  const imagePaths: string[] = [];

  // Сохраняем изображения
  if (files.length > 0) {
    const memoId = `memo_${Date.now()}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "memos", memoId);
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        imagePaths.push(`/uploads/memos/${memoId}/${fileName}`);
      }
    }
  }

  const memo = await prisma.memo.create({
    data: {
      title,
      content,
      images: imagePaths,
      isPublished,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(memo, { status: 201 });
}


