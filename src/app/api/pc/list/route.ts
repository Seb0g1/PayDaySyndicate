import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { fetchLangamePCLinking, fetchLangamePCTypes, type LangameSettings } from "@/lib/langame";

export async function GET() {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    try {
      const settings = await prisma.langameSettings.findFirst();
      if (!settings || !settings.enabled || !settings.apiKey) {
        // Если настройки не настроены, возвращаем пустой список или существующие ПК из БД
        try {
          const pcs = await prisma.pCMapping.findMany({
            orderBy: { pcNumber: "asc" },
          });
          return NextResponse.json(pcs);
        } catch (dbError: any) {
          // Если таблица не существует, возвращаем пустой массив
          if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('PCMapping')) {
            return NextResponse.json([]);
          }
          throw dbError;
        }
      }

      const langameSettings: LangameSettings = {
        apiKey: settings.apiKey,
        clubId: settings.clubId || "",
        baseUrl: settings.baseUrl || undefined,
      };

      // Получаем данные из Langame API
      let pcLinking: any[] = [];
      let pcTypes: any[] = [];
      
      try {
        const [pcLinkingResponse, pcTypesResponse] = await Promise.all([
          fetchLangamePCLinking(langameSettings),
          fetchLangamePCTypes(langameSettings),
        ]);
        
        // Убеждаемся, что ответы - массивы
        if (!Array.isArray(pcLinkingResponse)) {
          console.error("Langame API returned non-array for PCLinking:", pcLinkingResponse);
          throw new Error("Langame API вернул неверный формат данных для привязок ПК");
        }
        if (!Array.isArray(pcTypesResponse)) {
          console.error("Langame API returned non-array for PCTypes:", pcTypesResponse);
          throw new Error("Langame API вернул неверный формат данных для типов ПК");
        }
        
        pcLinking = pcLinkingResponse;
        pcTypes = pcTypesResponse;
      } catch (apiError: any) {
        console.error("Error fetching from Langame API:", apiError);
        // Если ошибка API, возвращаем существующие ПК из БД
        try {
          const pcs = await prisma.pCMapping.findMany({
            orderBy: { pcNumber: "asc" },
          });
          return NextResponse.json(pcs);
        } catch (dbError: any) {
          if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('PCMapping')) {
            return NextResponse.json([]);
          }
          throw dbError;
        }
      }

      // Синхронизируем ПК в базу данных
      try {
        for (const pc of pcLinking) {
          const pcType = pcTypes.find((t) => t.id === pc.packets_type_PC);
          
          // Используем name как pcNumber, если pc_number отсутствует
          const pcNumber = pc.pc_number || pc.name || `PC${pc.id}`;
          
          // Формируем название ПК (PC + номер или PS5)
          const pcDisplayNumber = pc.name ? (pc.isPS === 1 ? 'PS5' : `PC${pc.name}`) : `PC${pc.id}`;

          await prisma.pCMapping.upsert({
            where: { pcNumber: pcDisplayNumber },
            create: {
              pcNumber: pcDisplayNumber,
              langameId: pc.id,
              name: pc.name || null,
              packetsTypePC: pc.packets_type_PC,
              fiscalName: pc.fiscal_name || null,
              uuid: pc.UUID || null,
              clubId: pc.club_id || null,
              isPS: pc.isPS === 1,
              releType: pc.rele_type || null,
              color: pc.color || null,
              pcTypeId: pcType?.id || null,
              pcTypeName: pcType?.name || null,
              pcTypeNameEn: pcType?.name_en || null,
              pcTypeColor: pcType?.color || null,
            },
            update: {
              langameId: pc.id,
              name: pc.name || null,
              packetsTypePC: pc.packets_type_PC,
              fiscalName: pc.fiscal_name || null,
              uuid: pc.UUID || null,
              clubId: pc.club_id || null,
              isPS: pc.isPS === 1,
              releType: pc.rele_type || null,
              color: pc.color || null,
              pcTypeId: pcType?.id || null,
              pcTypeName: pcType?.name || null,
              pcTypeNameEn: pcType?.name_en || null,
              pcTypeColor: pcType?.color || null,
              pcNumber: pcDisplayNumber, // Обновляем pcNumber на случай изменения
            },
          });
        }
      } catch (dbError: any) {
        console.error("Error syncing PC to database:", dbError);
        // Если ошибка при синхронизации, возвращаем существующие ПК
        try {
          const pcs = await prisma.pCMapping.findMany({
            orderBy: { pcNumber: "asc" },
          });
          return NextResponse.json(pcs);
        } catch (e: any) {
          if (e.code === 'P2021' || e.message?.includes('does not exist') || e.message?.includes('PCMapping')) {
            return NextResponse.json([]);
          }
          throw e;
        }
      }

      // Возвращаем список ПК из базы данных
      const pcs = await prisma.pCMapping.findMany({
        orderBy: { pcNumber: "asc" },
      });

      return NextResponse.json(pcs);
    } catch (dbError: any) {
      // Если таблица не существует, возвращаем пустой массив
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('PCMapping')) {
        return NextResponse.json([]);
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error fetching PC list:", error);
    console.error("Error stack:", error.stack);
    console.error("Error code:", error.code);
    
    // Если таблица не существует, возвращаем пустой массив
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('PCMapping') || error.message?.includes('Table') || error.code === 'P2001') {
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { error: error.message || "Ошибка получения списка ПК", details: error.code || error.name },
      { status: 500 }
    );
  }
}

