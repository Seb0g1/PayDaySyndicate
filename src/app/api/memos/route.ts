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
  try {
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

    // Сериализуем steps правильно
    const serializedMemos = memos.map((memo) => ({
      ...memo,
      steps: memo.steps ? (typeof memo.steps === 'string' ? JSON.parse(memo.steps) : memo.steps) : null,
    }));

    return NextResponse.json(serializedMemos);
  } catch (error: any) {
    console.error("[API /memos GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
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
  const stepsJson = formData.get("steps") as string | null;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const files = formData.getAll("images") as File[];
  const imagePaths: string[] = [];

  // Сохраняем изображения (для обратной совместимости)
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

  // Создаем памятку сначала, чтобы получить ID
  const memo = await prisma.memo.create({
    data: {
      title,
      content,
      images: imagePaths,
      // steps будет добавлен позже, если есть
      isPublished,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Обработка шагов (после создания памятки, чтобы использовать правильный ID)
  let steps: any = null;
  if (stepsJson) {
    try {
      const parsedSteps = JSON.parse(stepsJson);
      const memoId = memo.id;
      const uploadDir = join(process.cwd(), "public", "uploads", "memos", memoId);
      await mkdir(uploadDir, { recursive: true });

      // Получаем все файлы для шагов
      const stepFiles = new Map<number, File>();
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("step_") && key.endsWith("_image") && value instanceof File) {
          const stepIndex = parseInt(key.replace("step_", "").replace("_image", ""));
          if (!isNaN(stepIndex)) {
            stepFiles.set(stepIndex, value);
          }
        }
      }

      // Обрабатываем каждый шаг
      const processedSteps = await Promise.all(
        parsedSteps.map(async (step: any, index: number) => {
          const stepFile = stepFiles.get(index);
          if (stepFile && stepFile.size > 0) {
            // Если есть новый файл изображения
            const bytes = await stepFile.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileName = `step_${index}_${Date.now()}_${stepFile.name}`;
            const filePath = join(uploadDir, fileName);
            await writeFile(filePath, buffer);
            return {
              description: step.description || "",
              image: `/uploads/memos/${memoId}/${fileName}`,
            };
          } else if (step.image) {
            // Если изображение уже существует (при редактировании)
            return {
              description: step.description || "",
              image: step.image,
            };
          }
          return {
            description: step.description || "",
            image: null,
          };
        })
      );
      steps = processedSteps;

      // Обновляем памятку с шагами
      if (steps.length > 0) {
        await prisma.memo.update({
          where: { id: memo.id },
          data: { steps },
        });
        memo.steps = steps;
      }
    } catch (error) {
      console.error("Error parsing steps:", error);
    }
  }

  return NextResponse.json(memo, { status: 201 });
}


