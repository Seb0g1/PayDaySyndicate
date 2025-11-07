import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { notifyPayment } from "@/lib/telegram";

export async function GET(req: Request) {
  const session = await getAuth();
  const userId = ((session as any)?.user as any)?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const periodStart = searchParams.get("periodStart");
  const periodEnd = searchParams.get("periodEnd");
  
  const payments = await prisma.salaryPayment.findMany({
    where: {
      ...(employeeId ? { employeeId } : {}),
      ...(periodStart && periodEnd ? {
        periodStart: { gte: new Date(periodStart) },
        periodEnd: { lte: new Date(periodEnd) },
      } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  
  return NextResponse.json(payments);
}

export async function POST(req: Request) {
  const session = await getAuth();
  const userId = ((session as any)?.user as any)?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  
  const formData = await req.formData();
  const employeeId = formData.get("employeeId") as string;
  const amount = formData.get("amount") as string;
  const periodStart = formData.get("periodStart") as string;
  const periodEnd = formData.get("periodEnd") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;
  const pdf = formData.get("pdf") as File | null;
  
  let pdfPath: string | undefined;
  
  if (pdf && pdf.size > 0) {
    try {
      const bytes = await pdf.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "salary-payments");
      await mkdir(uploadsDir, { recursive: true });
      
      const filename = `${employeeId}-${Date.now()}.pdf`;
      pdfPath = `/uploads/salary-payments/${filename}`;
      
      await writeFile(path.join(uploadsDir, filename), buffer);
    } catch (error) {
      console.error("Error saving PDF:", error);
    }
  }
  
  const payment = await prisma.salaryPayment.create({
    data: {
      employeeId,
      amount: parseFloat(amount),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: status as any,
      notes: notes || null,
      pdfFile: pdfPath || null,
    },
    include: {
      employee: { select: { id: true, name: true, telegramTag: true } }
    }
  });
  
  // Отправляем уведомление в Telegram
  try {
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      const userSession = await getAuth();
      const userName = ((userSession as any)?.user as any)?.name || "Администратор";
      await notifyPayment({
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        adminName: userName,
        employeeName: payment.employee.name,
        employeeTag: payment.employee.telegramTag || undefined,
        amount: Number(payment.amount),
        periodStart: payment.periodStart,
        periodEnd: payment.periodEnd,
        status: payment.status,
        topicId: settings.topicPayment || undefined,
      });
    }
  } catch (telegramError) {
    console.error("Failed to send Telegram notification:", telegramError);
    // Не прерываем выполнение из-за ошибки уведомления
  }
  
  return NextResponse.json(payment);
}

