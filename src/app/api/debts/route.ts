import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyDebt } from "@/lib/telegram";
import { createNotificationForEmployee } from "@/lib/notifications";
import { checkPermission, getUserInfo } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await getAuth();
    const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;
    const userId = (((session as any)?.user as any)?.id ?? "") as string;
    
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") ?? undefined;
    const productId = searchParams.get("productId") ?? undefined;
    
    // Проверяем права на просмотр долгов
    const canViewAll = await checkPermission("debts", "view", "all");
    const canViewOwn = await checkPermission("debts", "view", "own");
    
    const where: any = {};
    
    // Системные роли с полным доступом
    if (role === "DIRECTOR" || role === "OWNER") {
      // Разрешаем просмотр всех долгов
      if (employeeId) where.employeeId = employeeId;
      if (productId) where.productId = productId;
    } else if (canViewAll) {
      // Пользователь с правом на просмотр всех долгов (например, Seniour_Admin)
      if (employeeId) where.employeeId = employeeId;
      if (productId) where.productId = productId;
    } else if (canViewOwn) {
      // Пользователь может видеть только свои долги
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.employeeId) {
        return NextResponse.json([]);
      }
      where.employeeId = user.employeeId;
      if (productId) where.productId = productId;
    } else {
      // Нет прав на просмотр долгов
      return NextResponse.json([]);
    }
    
    const debts = await prisma.debt.findMany({ 
      where, 
      include: { 
        product: true, 
        employee: { select: { id: true, name: true, telegramTag: true } } 
      }, 
      orderBy: { date: "desc" } 
    });
    
    return NextResponse.json(debts);
  } catch (error: any) {
    console.error("GET debts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const schema = z.object({ employeeId: z.string(), productId: z.string(), quantity: z.number().int().positive(), date: z.string() });

export async function POST(req: Request) {
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;
  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  
  // Получаем информацию о пользователе, включая имя и кастомную роль
  const userInfo = await getUserInfo();
  const userName = userInfo?.name ?? "Администратор";
  
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { employeeId, productId, quantity, date } = parsed.data;
  
  // Проверяем права на создание долгов
  const canCreateForAll = await checkPermission("debts", "create", "all");
  const canCreateForOwn = await checkPermission("debts", "create", "own");
  
  // Системные роли с полным доступом
  if (role === "DIRECTOR" || role === "OWNER") {
    // Разрешаем создание долгов для всех
  } else if (canCreateForAll) {
    // Пользователь с правом на создание долгов для всех
    // Разрешаем создание долгов для всех
  } else if (canCreateForOwn) {
    // Пользователь может создавать долги только для себя
    // Проверяем, что пользователь пытается создать долг для себя
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.employeeId || user.employeeId !== employeeId) {
      return new NextResponse("Forbidden: Вы можете создавать долги только для себя", { status: 403 });
    }
  } else {
    // Нет прав на создание долгов
    return new NextResponse("Forbidden", { status: 403 });
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return new NextResponse("Product not found", { status: 404 });
  
  // Проверяем, существует ли уже долг для этого сотрудника и товара
  // Объединяем все долги по товару и сотруднику, независимо от даты
  const existingDebt = await prisma.debt.findFirst({
    where: {
      employeeId,
      productId,
    },
    include: { employee: { select: { id: true, name: true, telegramTag: true } } },
  });
  
  let created;
  let finalQuantity: number;
  let finalAmount: number;
  
  if (existingDebt) {
    // Если долг уже существует, увеличиваем количество
    finalQuantity = existingDebt.quantity + quantity;
    finalAmount = Number(product.price.mul(finalQuantity));
    created = await prisma.debt.update({
      where: { id: existingDebt.id },
      data: {
        quantity: finalQuantity,
        amount: product.price.mul(finalQuantity),
        date: new Date(date), // Обновляем дату на последнюю
      },
      include: { employee: { select: { id: true, name: true, telegramTag: true } } },
    });
  } else {
    // Если долга нет, создаем новую запись
    finalQuantity = quantity;
    finalAmount = Number(product.price.mul(quantity));
    created = await prisma.debt.create({ 
      data: { employeeId, productId, quantity, date: new Date(date), amount: product.price.mul(quantity) },
      include: { employee: { select: { id: true, name: true, telegramTag: true } } },
    });
  }
  
  // Отправляем уведомление в Telegram
  try {
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      await notifyDebt({
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        adminName: userName,
        productName: product.name,
        quantity: finalQuantity,
        telegramTag: created.employee?.telegramTag || undefined,
        topicId: settings.topicDebt || undefined,
      });
    }

    // Создаем уведомление для сотрудника
    await createNotificationForEmployee(employeeId, {
      type: "debt",
      title: "Новый долг",
      message: `Вам записан долг: ${product.name} × ${finalQuantity} шт. = ${finalAmount.toFixed(2)} ₽`,
      link: `/dashboard/debts`,
    });
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    // Не прерываем создание долга из-за ошибки уведомления
  }
  
  return NextResponse.json(created, { status: 201 });
}


