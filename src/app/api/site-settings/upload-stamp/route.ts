import { NextResponse } from "next/server";
import { requireDirector } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Проверяем, что файл - PNG
    if (!file.type.includes("png") && !file.name.toLowerCase().endsWith(".png")) {
      return NextResponse.json({ error: "Only PNG files are allowed" }, { status: 400 });
    }

    // Сохраняем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "uploads", "stamps");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `stamp-${Date.now()}.png`;
    const filePath = join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/stamps/${filename}`;

    // Обновляем настройки сайта
    let settings = await prisma.siteSettings.findFirst();
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: "default",
          payslipStampImage: publicPath,
        } as any,
      });
    } else {
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          payslipStampImage: publicPath,
        } as any,
      });
    }

    return NextResponse.json({ success: true, path: publicPath });
  } catch (error: any) {
    console.error("POST upload-stamp error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

