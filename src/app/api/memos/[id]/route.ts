import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const updateMemoSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  images: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

  const where: any = { id };
  if (role !== "DIRECTOR") {
    where.isPublished = true;
  }

  const memo = await prisma.memo.findUnique({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!memo) {
    return NextResponse.json({ error: "Memo not found" }, { status: 404 });
  }

  return NextResponse.json(memo);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  const { id } = await params;
  const formData = await req.formData();
  const title = formData.get("title") as string | null;
  const content = formData.get("content") as string | null;
  const isPublished = formData.get("isPublished") as string | null;
  const existingImages = formData.get("existingImages") as string | null;

  const updateData: any = {};
  if (title !== null) updateData.title = title;
  if (content !== null) updateData.content = content;
  if (isPublished !== null) updateData.isPublished = isPublished === "true";

  // Обработка изображений
  const files = formData.getAll("images") as File[];
  let imagePaths: string[] = existingImages ? JSON.parse(existingImages) : [];

  if (files.length > 0) {
    const memoId = id;
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

  updateData.images = imagePaths;

  const updated = await prisma.memo.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  const { id } = await params;
  const memo = await prisma.memo.findUnique({ where: { id } });

  if (memo) {
    // Удаляем изображения
    for (const imagePath of memo.images) {
      const filePath = join(process.cwd(), "public", imagePath);
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }
    }
  }

  await prisma.memo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}


