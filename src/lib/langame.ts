/**
 * Langame API клиент
 */

export interface LangameGoodsResponse {
  id: number;
  name: string | null;
  count: number;
  price?: number; // Цена товара, если есть
}

export interface LangameProductsResponse {
  id: number;
  name: string | null;
  active: number; // 0 или 1
  truth_sign?: number; // Признак маркированного товара
}

export interface LangamePCLinking {
  id: number;
  name: string | null; // Это может быть номер ПК (например, "4", "PS5")
  pc_number?: string; // Может отсутствовать, используем name
  packets_type_PC: number;
  fiscal_name: string | null;
  UUID: string | null;
  club_id: number;
  date: string;
  isPS: number;
  rele_type: string | null;
  color: string | null;
}

export interface LangamePCTypes {
  id: number;
  name: string;
  name_en: string | null;
  sort: number;
  color: string | null;
}

export interface LangameSettings {
  apiKey: string;
  clubId: string;
  baseUrl?: string;
}

/**
 * Получить остатки товаров по складам
 */
export async function fetchLangameGoods(
  settings: LangameSettings
): Promise<LangameGoodsResponse[]> {
  // Обрабатываем baseUrl: если он содержит /public_api, используем его как есть
  // Иначе добавляем /public_api если его нет
  let baseUrl = settings.baseUrl || "https://api.langame.ru";
  baseUrl = baseUrl.replace(/\/$/, ""); // Убираем завершающий слеш если есть
  
  // Если baseUrl уже содержит /public_api, используем его как есть
  // Иначе добавляем /public_api
  if (!baseUrl.includes("/public_api")) {
    baseUrl = `${baseUrl}/public_api`;
  }
  
  const url = new URL(`${baseUrl}/goods/list`);
  url.searchParams.set("club_id", settings.clubId);

  console.log(`[Langame API] Fetching goods from: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-KEY": settings.apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Langame API] Error fetching goods: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Langame API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // Langame API может возвращать объект с полем data, содержащим массив
  // Или напрямую массив
  if (Array.isArray(data)) {
    return data;
  }
  
  // Если это объект с полем data, извлекаем массив
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data;
  }
  
  // Если это объект с другими полями, но есть массив внутри
  console.error("Langame API returned non-array:", data);
  throw new Error(`Langame API вернул неверный формат данных. Ожидался массив или объект с полем data, получено: ${typeof data}`);
}

/**
 * Получить список продуктов с активностью
 */
export async function fetchLangameProducts(
  settings: LangameSettings
): Promise<LangameProductsResponse[]> {
  // Обрабатываем baseUrl: если он содержит /public_api, используем его как есть
  // Иначе добавляем /public_api если его нет
  let baseUrl = settings.baseUrl || "https://api.langame.ru";
  baseUrl = baseUrl.replace(/\/$/, ""); // Убираем завершающий слеш если есть
  
  // Если baseUrl уже содержит /public_api, используем его как есть
  // Иначе добавляем /public_api
  if (!baseUrl.includes("/public_api")) {
    baseUrl = `${baseUrl}/public_api`;
  }
  
  const url = `${baseUrl}/products/list`;

  console.log(`[Langame API] Fetching products from: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": settings.apiKey,
      "Content-Type": "application/json",
      "accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Langame API] Error fetching products: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Langame API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // Langame API может возвращать объект с полем data, содержащим массив
  // Или напрямую массив
  if (Array.isArray(data)) {
    return data;
  }
  
  // Если это объект с полем data, извлекаем массив
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data;
  }
  
  // Если это объект с полем status и data
  if (data && typeof data === 'object' && data.status && Array.isArray(data.data)) {
    return data.data;
  }
  
  // Если это объект с другими полями, но есть массив внутри
  console.error("Langame API returned non-array for products:", data);
  throw new Error(`Langame API вернул неверный формат данных. Ожидался массив или объект с полем data, получено: ${typeof data}`);
}

/**
 * Получить список привязок ПК по типам
 */
export async function fetchLangamePCLinking(
  settings: LangameSettings
): Promise<LangamePCLinking[]> {
  // Обрабатываем baseUrl: если он содержит /public_api, используем его как есть
  // Иначе добавляем /public_api если его нет
  let baseUrl = settings.baseUrl || "https://api.langame.ru";
  baseUrl = baseUrl.replace(/\/$/, ""); // Убираем завершающий слеш если есть
  
  // Если baseUrl уже содержит /public_api, используем его как есть
  // Иначе добавляем /public_api
  if (!baseUrl.includes("/public_api")) {
    baseUrl = `${baseUrl}/public_api`;
  }
  
  const url = `${baseUrl}/global/linking_pc_by_type/list`;

  console.log(`[Langame API] Fetching PC linking from: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": settings.apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Langame API] Error fetching PC linking: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Langame API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // Langame API может возвращать объект с полем data, содержащим массив
  // Или напрямую массив
  if (Array.isArray(data)) {
    return data;
  }
  
  // Если это объект с полем data, извлекаем массив
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data;
  }
  
  // Если это объект с другими полями, но есть массив внутри
  console.error("Langame API returned non-array for PCLinking:", data);
  throw new Error(`Langame API вернул неверный формат данных. Ожидался массив или объект с полем data, получено: ${typeof data}`);
}

/**
 * Получить типы ПК в клубах
 */
export async function fetchLangamePCTypes(
  settings: LangameSettings
): Promise<LangamePCTypes[]> {
  // Обрабатываем baseUrl: если он содержит /public_api, используем его как есть
  // Иначе добавляем /public_api если его нет
  let baseUrl = settings.baseUrl || "https://api.langame.ru";
  baseUrl = baseUrl.replace(/\/$/, ""); // Убираем завершающий слеш если есть
  
  // Если baseUrl уже содержит /public_api, используем его как есть
  // Иначе добавляем /public_api
  if (!baseUrl.includes("/public_api")) {
    baseUrl = `${baseUrl}/public_api`;
  }
  
  const url = `${baseUrl}/global/types_of_pc_in_clubs/list`;

  console.log(`[Langame API] Fetching PC types from: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": settings.apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Langame API] Error fetching PC types: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Langame API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // Langame API может возвращать объект с полем data, содержащим массив
  // Или напрямую массив
  if (Array.isArray(data)) {
    return data;
  }
  
  // Если это объект с полем data, извлекаем массив
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data;
  }
  
  // Если это объект с другими полями, но есть массив внутри
  console.error("Langame API returned non-array for PCTypes:", data);
  throw new Error(`Langame API вернул неверный формат данных. Ожидался массив или объект с полем data, получено: ${typeof data}`);
}

/**
 * Управление ПК (команды)
 */
export type PCCommand = "tech_start" | "tech_stop" | "lock" | "unlock" | "reboot";
export type PCCommandType = "all" | "free";

export interface PCManageRequest {
  club_id?: number | null;
  command: PCCommand;
  type: PCCommandType;
  uuids?: string[] | null;
}

export async function managePC(
  settings: LangameSettings,
  request: PCManageRequest
): Promise<any> {
  // Обрабатываем baseUrl: если он содержит /public_api, используем его как есть
  // Иначе добавляем /public_api если его нет
  let baseUrl = settings.baseUrl || "https://api.langame.ru";
  baseUrl = baseUrl.replace(/\/$/, ""); // Убираем завершающий слеш если есть
  
  // Если baseUrl уже содержит /public_api, используем его как есть
  // Иначе добавляем /public_api
  if (!baseUrl.includes("/public_api")) {
    baseUrl = `${baseUrl}/public_api`;
  }
  
  // Endpoint может быть другим, нужно проверить в документации API
  // Пока используем предполагаемый endpoint
  const url = `${baseUrl}/pc/manage`;

  // При type: "all" не передаем uuids (API не принимает uuids с type: "all")
  const body: any = {
    club_id: request.club_id || (settings.clubId ? parseInt(settings.clubId) : null),
    command: request.command,
    type: request.type,
  };
  
  // Передаем uuids только если type: "free"
  if (request.type === "free" && request.uuids && request.uuids.length > 0) {
    body.uuids = request.uuids;
  }

  console.log(`[Langame API] Managing PC: ${url}`, body);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": settings.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Langame API] Error managing PC: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Langame API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

