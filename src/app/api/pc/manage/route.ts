import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { managePC, type LangameSettings, type PCManageRequest } from "@/lib/langame";
import { z } from "zod";

const manageSchema = z.object({
  command: z.enum(["tech_start", "tech_stop", "lock", "unlock", "reboot"]),
  type: z.enum(["all", "free"]).default("free"),
  club_id: z.number().optional().nullable(),
  uuids: z.array(z.string()).optional().nullable(),
});

export async function POST(req: Request) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  try {
    // Проверяем, существует ли таблица LangameSettings
    const tableExists = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'LangameSettings' 
      LIMIT 1;
    ` as any[];
    
    if (!tableExists || tableExists.length === 0) {
      return NextResponse.json(
        { error: "Таблица LangameSettings не существует" },
        { status: 400 }
      );
    }
    
    const settings = await prisma.langameSettings.findFirst();
    if (!settings || !settings.enabled || !settings.apiKey) {
      return NextResponse.json(
        { error: "Langame API не настроен или отключен" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = manageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const langameSettings: LangameSettings = {
      apiKey: settings.apiKey,
      clubId: settings.clubId || "",
      baseUrl: settings.baseUrl || undefined,
    };

    const request: PCManageRequest = {
      command: parsed.data.command,
      type: parsed.data.type,
      club_id: parsed.data.club_id || null,
      uuids: parsed.data.uuids || null,
    };

    const result = await managePC(langameSettings, request);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error managing PC:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка управления ПК" },
      { status: 500 }
    );
  }
}

