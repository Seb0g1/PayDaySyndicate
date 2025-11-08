import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuth();
    const userId = ((session as any)?.user as any)?.id;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const { read, soundPlayed } = body;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return new NextResponse("Not found", { status: 404 });
    }

    const updateData: any = {};
    if (read !== undefined) {
      updateData.read = read;
      if (read) {
        updateData.readAt = new Date();
      } else {
        updateData.readAt = null;
      }
    }
    if (soundPlayed !== undefined) {
      updateData.soundPlayed = soundPlayed;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH notifications/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuth();
    const userId = ((session as any)?.user as any)?.id;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await ctx.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return new NextResponse("Not found", { status: 404 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("DELETE notifications/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

