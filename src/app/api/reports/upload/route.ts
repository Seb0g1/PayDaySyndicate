import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const reportId = formData.get("reportId") as string;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const category = formData.get("category") as string | null;
    
    // Если есть категория, создаем подпапку для категории
    const uploadDir = category 
      ? join(process.cwd(), "public", "uploads", reportId, category)
      : join(process.cwd(), "public", "uploads", reportId);
    
    // Создаем директорию если её нет
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const savedFiles: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = join(uploadDir, fileName);
      
      await writeFile(filePath, buffer);
      // Если есть категория, сохраняем путь с категорией
      savedFiles.push(category ? `${category}/${fileName}` : fileName);
    }

    return NextResponse.json({ files: savedFiles }, { status: 200 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

