import FormDataNode from 'form-data';
import axios from 'axios';

interface SendMessageOptions {
  message: string;
  botToken: string;
  chatId?: string;
  topicId?: string; // Для форумов (топиков) - теперь строка
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

/**
 * Отправляет сообщение в Telegram через Bot API
 * Возвращает message_id если успешно, иначе null
 */
export async function sendTelegramMessage(options: SendMessageOptions): Promise<number | null> {
  try {
    const { message, botToken, chatId, topicId, parseMode = "HTML" } = options;

    if (!botToken) {
      console.error("Bot token is required");
      return null;
    }

    // Определяем chat_id: если в topicId есть подчеркивание, извлекаем chatId из него
    let targetChatId = chatId;
    let threadId = null;
    
    // Если указан topic_id в формате "-1002586575405_10539", извлекаем обе части
    if (topicId && topicId.includes('_')) {
      const [chatIdFromTopic, threadIdFromTopic] = topicId.split('_');
      targetChatId = chatIdFromTopic;
      threadId = parseInt(threadIdFromTopic);
    } else if (topicId) {
      // Если topicId просто число, используем chatId + thread_id
      threadId = parseInt(topicId);
    }
    
    if (!targetChatId) {
      console.error("Chat ID is required");
      return null;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const body: any = {
      chat_id: targetChatId,
      text: message,
      parse_mode: parseMode,
    };

    // Если указан thread_id, добавляем message_thread_id (для форумов)
    if (threadId) {
      body.message_thread_id = threadId;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API error:", errorData);
      return null;
    }

    const data = await response.json();
    return data.result?.message_id || null;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return null;
  }
}

/**
 * Удаляет сообщение в Telegram
 */
export async function deleteTelegramMessage(options: {
  botToken: string;
  chatId: string;
  messageId: number;
  topicId?: string;
}): Promise<boolean> {
  try {
    const { botToken, chatId, messageId, topicId } = options;

    if (!botToken || !chatId || !messageId) {
      console.error("Bot token, chat ID and message ID are required");
      return false;
    }

    // Определяем chat_id и thread_id
    let targetChatId = chatId;
    let threadId = null;
    
    if (topicId && topicId.includes('_')) {
      const [chatIdFromTopic, threadIdFromTopic] = topicId.split('_');
      targetChatId = chatIdFromTopic;
      threadId = parseInt(threadIdFromTopic);
    } else if (topicId) {
      threadId = parseInt(topicId);
    }

    const url = `https://api.telegram.org/bot${botToken}/deleteMessage`;
    
    const body: any = {
      chat_id: targetChatId,
      message_id: messageId,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram Delete API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting Telegram message:", error);
    return false;
  }
}

/**
 * Редактирует сообщение в Telegram
 */
export async function editTelegramMessage(options: {
  botToken: string;
  chatId: string;
  messageId: number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  topicId?: string;
}): Promise<boolean> {
  try {
    const { botToken, chatId, messageId, text, parseMode = "HTML", topicId } = options;

    if (!botToken || !chatId || !messageId) {
      console.error("Bot token, chat ID and message ID are required");
      return false;
    }

    // Определяем chat_id и thread_id
    let targetChatId = chatId;
    
    if (topicId && topicId.includes('_')) {
      const [chatIdFromTopic] = topicId.split('_');
      targetChatId = chatIdFromTopic;
    }

    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
    
    const body: any = {
      chat_id: targetChatId,
      message_id: messageId,
      text: text,
      parse_mode: parseMode,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram Edit API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error editing Telegram message:", error);
    return false;
  }
}

/**
 * Отправляет фотографию в Telegram через Bot API
 * Поддерживает как URL, так и локальные файлы
 */
export async function sendTelegramPhoto(options: {
  photoUrl: string;
  caption?: string;
  botToken: string;
  chatId?: string;
  topicId?: string;
}): Promise<boolean> {
  try {
    const { photoUrl, caption, botToken, chatId, topicId } = options;

    if (!botToken) {
      console.error("Bot token is required");
      return false;
    }

    // Определяем chat_id
    let targetChatId = chatId;
    let threadId = null;
    
    if (topicId && topicId.includes('_')) {
      const [chatIdFromTopic, threadIdFromTopic] = topicId.split('_');
      targetChatId = chatIdFromTopic;
      threadId = parseInt(threadIdFromTopic);
    } else if (topicId) {
      threadId = parseInt(topicId);
    }
    
    if (!targetChatId) {
      console.error("Chat ID is required");
      return false;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    
    // Если это локальный URL, загружаем файл
    if (photoUrl.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), 'public', photoUrl);
      
      console.log("Attempting to send local photo:", fullPath);
      
      if (fs.existsSync(fullPath)) {
        // Читаем файл в буфер и отправляем через multipart/form-data
        const fileBuffer = fs.readFileSync(fullPath);
        const fileName = path.basename(fullPath);
        
        const formData = new FormDataNode();
        formData.append('chat_id', targetChatId);
        formData.append('photo', fileBuffer, {
          filename: fileName,
          contentType: 'image/jpeg', // Можно улучшить, определяя по расширению
        });
        
        if (caption) {
          formData.append('caption', caption);
        }
        formData.append('parse_mode', 'HTML');
        
        if (threadId) {
          formData.append('message_thread_id', threadId.toString());
        }

        const headers = formData.getHeaders();
        console.log("Sending photo to Telegram with axios...");
        
        try {
          const response = await axios.post(url, formData, {
            headers: headers,
          });
          
          console.log("Photo sent successfully:", response.status);
          return true;
        } catch (axiosError: any) {
          if (axiosError.response) {
            console.error("Telegram Photo API error:", axiosError.response.status, axiosError.response.data);
          } else {
            console.error("Telegram Photo API error:", axiosError.message);
          }
          return false;
        }
      } else {
        console.error("Photo file not found:", fullPath);
        return false;
      }
    } else {
      // Если это внешний URL, отправляем через JSON
      const body: any = {
        chat_id: targetChatId,
        photo: photoUrl,
        parse_mode: 'HTML',
      };

      if (caption) {
        body.caption = caption;
      }

      if (threadId) {
        body.message_thread_id = threadId;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Telegram Photo API error:", errorData);
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error("Error sending Telegram photo:", error);
    return false;
  }
}

/**
 * Отправляет уведомление о смене
 */
export async function notifyShiftCreated(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  employeeName: string;
  shiftDate: Date;
  shiftType: string;
  role: string;
  topicId?: string;
  employeeTag?: string;
}): Promise<boolean> {
  const dateStr = `${options.shiftDate.getDate().toString().padStart(2, '0')}.${(options.shiftDate.getMonth() + 1).toString().padStart(2, '0')}.${options.shiftDate.getFullYear()}`;

  const roleLabel = options.role === "DIRECTOR" ? "Директор" : options.role === "SENIOR_ADMIN" ? "Старший Администратор" : "Администратор";
  const adminLine = options.role === "DIRECTOR" ? `Директор: <b>${options.adminName}</b>` : `Старший Администратор: <b>${options.adminName}</b>`;
  const employeeLine = options.employeeTag ? `Администратору ${options.employeeTag}` : `Администратору: <b>${options.employeeName}</b>`;

  const message = `
${adminLine} добавил смену ${employeeLine} на <b>${dateStr}</b> (<b>${options.shiftType}</b>).
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });
  return messageId !== null;
}


/**
 * Отправляет уведомление о пробковом сборе
 */
export async function notifyCorkFeeReport(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  topicId?: string;
  amount?: number;
  category?: string;
  pcNumber?: string;
  telegramTag?: string;
  photoUrls?: string[];
}): Promise<boolean> {
  const tagLine = options.telegramTag ? `Администратор ${options.telegramTag}` : `Администратор: <b>${options.adminName}</b>`;
  const amountLine = options.amount ? `\nСумма: <b>${options.amount} ₽</b>` : "";
  
  // Переводим категорию на русский
  const categoryTranslations: Record<string, string> = {
    'NORMAL': 'Обычный',
    'LIGHT': 'Лёгкий алкоголь',
    'STRONG': 'Крепкий алкоголь'
  };
  const categoryText = options.category ? categoryTranslations[options.category] || options.category : '';
  const categoryLine = categoryText ? `\nТип пробкового сбора: <b>${categoryText}</b>` : "";
  
  const pcLine = options.pcNumber ? `\nНомер компьютера: <b>${options.pcNumber}</b>` : "";
  
  const message = `
${tagLine}

Добавил в отчёт пробковый сбор!${categoryLine}${pcLine}${amountLine}
  `.trim();

  // Если есть фотографии, отправляем первую с текстом как caption, остальные отдельно
  if (options.photoUrls && options.photoUrls.length > 0) {
    // Отправляем первую фотографию с текстом
    const firstPhotoSent = await sendTelegramPhoto({
      photoUrl: options.photoUrls[0],
      caption: message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });

    // Отправляем остальные фотографии без текста
    if (firstPhotoSent && options.photoUrls.length > 1) {
      for (let i = 1; i < options.photoUrls.length; i++) {
        try {
          await sendTelegramPhoto({
            photoUrl: options.photoUrls[i],
            botToken: options.botToken,
            chatId: options.chatId,
            topicId: options.topicId,
          });
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    return firstPhotoSent;
  } else {
    // Если фотографий нет, отправляем только текстовое сообщение
    const messageId = await sendTelegramMessage({
      message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });
    return messageId !== null;
  }
}

/**
 * Отправляет уведомление о финансовом отчёте
 */
export async function notifyFinancialReport(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  shiftDate?: Date;
  shiftPhase?: string;
  nalLangame?: number;
  nalFact?: number;
  discrepancy?: string;
  topicId?: string;
  photoUrls?: string[];
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Администратор: ${options.telegramTag}` : `Администратор: <b>${options.adminName}</b>`;
  const phaseText = options.shiftPhase === 'START' ? 'начале' : 'окончании';
  const shiftLine = options.shiftDate ? `Смена: <b>${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(options.shiftDate)}</b>` : '';
  const nalLangameLine = options.nalLangame !== undefined ? `Нал В Langame: <b>${options.nalLangame}</b>` : '';
  const nalFactLine = options.nalFact !== undefined ? `Нал факт: <b>${options.nalFact}</b>` : '';
  const discrepancyLine = options.discrepancy ? `\nПричина расхождения: <b>${options.discrepancy}</b>` : '';
  
  const message = `
${adminLine} прислал отчёт о ${phaseText} смены.

${shiftLine}
${nalLangameLine}
${nalFactLine}${discrepancyLine}
  `.trim();

  // Если есть фотографии, отправляем первую с текстом как caption, остальные отдельно
  if (options.photoUrls && options.photoUrls.length > 0) {
    // Отправляем первую фотографию с текстом
    const firstPhotoSent = await sendTelegramPhoto({
      photoUrl: options.photoUrls[0],
      caption: message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });

    // Отправляем остальные фотографии без текста
    if (firstPhotoSent && options.photoUrls.length > 1) {
      for (let i = 1; i < options.photoUrls.length; i++) {
        try {
          await sendTelegramPhoto({
            photoUrl: options.photoUrls[i],
            botToken: options.botToken,
            chatId: options.chatId,
            topicId: options.topicId,
          });
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    return firstPhotoSent;
  } else {
    // Если фотографий нет, отправляем только текстовое сообщение
    const messageId = await sendTelegramMessage({
      message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });
    return messageId !== null;
  }
}

/**
 * Отправляет уведомление о кальянах
 */
export async function notifyHookahReport(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  shiftDate?: Date;
  topicId?: string;
  photoUrls?: string[];
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Администратор ${options.telegramTag}` : `Администратор: <b>${options.adminName}</b>`;
  const shiftLine = options.shiftDate ? `Смена: <b>${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(options.shiftDate)}</b>` : '';
  
  const message = `
${adminLine} добавил отчёт о кальяне себе в смену.

${shiftLine}
  `.trim();

  // Если есть фотографии, отправляем первую с текстом как caption, остальные отдельно
  if (options.photoUrls && options.photoUrls.length > 0) {
    // Отправляем первую фотографию с текстом
    const firstPhotoSent = await sendTelegramPhoto({
      photoUrl: options.photoUrls[0],
      caption: message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });

    // Отправляем остальные фотографии без текста
    if (firstPhotoSent && options.photoUrls.length > 1) {
      for (let i = 1; i < options.photoUrls.length; i++) {
        try {
          await sendTelegramPhoto({
            photoUrl: options.photoUrls[i],
            botToken: options.botToken,
            chatId: options.chatId,
            topicId: options.topicId,
          });
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    return firstPhotoSent;
  } else {
    // Если фотографий нет, отправляем только текстовое сообщение
    const messageId = await sendTelegramMessage({
      message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });
    return messageId !== null;
  }
}

/**
 * Отправляет уведомление о состоянии столов
 */
export async function notifyTableStatusReport(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  shiftDate?: Date;
  topicId?: string;
  photoUrls?: string[];
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Администратор ${options.telegramTag}` : `Администратор: <b>${options.adminName}</b>`;
  const shiftLine = options.shiftDate ? `Смена: <b>${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(options.shiftDate)}</b>` : '';
  
  const message = `
${adminLine} добавил отчёт о СТОЛАХ себе в смену.

${shiftLine}
  `.trim();

  // Если есть фотографии, отправляем первую с текстом как caption, остальные отдельно
  if (options.photoUrls && options.photoUrls.length > 0) {
    // Отправляем первую фотографию с текстом
    const firstPhotoSent = await sendTelegramPhoto({
      photoUrl: options.photoUrls[0],
      caption: message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });

    // Отправляем остальные фотографии без текста
    if (firstPhotoSent && options.photoUrls.length > 1) {
      for (let i = 1; i < options.photoUrls.length; i++) {
        try {
          await sendTelegramPhoto({
            photoUrl: options.photoUrls[i],
            botToken: options.botToken,
            chatId: options.chatId,
            topicId: options.topicId,
          });
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    return firstPhotoSent;
  } else {
    // Если фотографий нет, отправляем только текстовое сообщение
    const messageId = await sendTelegramMessage({
      message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });
    return messageId !== null;
  }
}

/**
 * Отправляет уведомление об акциях
 */
export async function notifyPromotionReport(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  reportDate?: string;
  phone?: string;
  clientName?: string;
  promoType?: string;
  topicId?: string;
  photoUrls?: string[];
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Администратор: ${options.telegramTag}` : `Администратор: <b>${options.adminName}</b>`;
  const dateLine = options.reportDate ? `Дата: <b>${options.reportDate}</b>` : '';
  const phoneLine = options.phone ? `Последние 4 цифры клиента: <b>${options.phone}</b>` : '';
  const nameLine = options.clientName ? `Имя клиента: <b>${options.clientName}</b>` : '';
  const promoTypeText = options.promoType === 'REVIEW' ? 'Отзыв' : 'Кто больше ест тот больше играет';
  const promoLine = options.promoType ? `Тип акции: <b>${promoTypeText}</b>` : '';
  
  const message = `
${adminLine} добавил отчёты о акции себе в смену.

${dateLine}
${phoneLine}
${nameLine}
${promoLine}
  `.trim();

  // Если есть фотографии, отправляем первую с текстом как caption, остальные отдельно
  if (options.photoUrls && options.photoUrls.length > 0) {
    // Отправляем первую фотографию с текстом
    const firstPhotoSent = await sendTelegramPhoto({
      photoUrl: options.photoUrls[0],
      caption: message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });

    // Отправляем остальные фотографии без текста
    if (firstPhotoSent && options.photoUrls.length > 1) {
      for (let i = 1; i < options.photoUrls.length; i++) {
        try {
          await sendTelegramPhoto({
            photoUrl: options.photoUrls[i],
            botToken: options.botToken,
            chatId: options.chatId,
            topicId: options.topicId,
          });
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    return firstPhotoSent;
  } else {
    // Если фотографий нет, отправляем только текстовое сообщение
    const messageId = await sendTelegramMessage({
      message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });
    return messageId !== null;
  }
}

/**
 * Отправляет уведомление о PlayStation
 */
export async function notifyPlayStationReport(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  shiftDate?: Date;
  time?: string;
  topicId?: string;
  photoUrls?: string[];
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Администратор ${options.telegramTag}` : `Администратор: <b>${options.adminName}</b>`;
  const shiftLine = options.shiftDate ? `Смена: <b>${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(options.shiftDate)}</b>` : '';
  const timeLine = options.time ? `Время сеанса: <b>${options.time}</b>` : '';
  
  const message = `
${adminLine} добавил отчёт о PS5 себе в смену.

${shiftLine}
${timeLine}
  `.trim();

  // Если есть фотографии, отправляем первую с текстом как caption, остальные отдельно
  if (options.photoUrls && options.photoUrls.length > 0) {
    // Отправляем первую фотографию с текстом
    const firstPhotoSent = await sendTelegramPhoto({
      photoUrl: options.photoUrls[0],
      caption: message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });

    // Отправляем остальные фотографии без текста
    if (firstPhotoSent && options.photoUrls.length > 1) {
      for (let i = 1; i < options.photoUrls.length; i++) {
        try {
          await sendTelegramPhoto({
            photoUrl: options.photoUrls[i],
            botToken: options.botToken,
            chatId: options.chatId,
            topicId: options.topicId,
          });
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    return firstPhotoSent;
  } else {
    // Если фотографий нет, отправляем только текстовое сообщение
    const messageId = await sendTelegramMessage({
      message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });
    return messageId !== null;
  }
}

/**
 * Отправляет уведомление о накладных
 */
export async function notifyVatInvoiceReport(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  invoiceDate?: string;
  month?: string;
  description?: string;
  topicId?: string;
  photoUrls?: string[];
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Администратор ${options.telegramTag}` : `Администратор: <b>${options.adminName}</b>`;
  const dateLine = options.invoiceDate ? `Смена: <b>${options.invoiceDate}</b>` : '';
  const monthLine = options.month ? `Месяц: <b>${options.month}</b>` : '';
  const descLine = options.description ? `Что пришло/на что потрачено: <b>${options.description}</b>` : '';
  
  const message = `
${adminLine} добавил отчёты о накладной себе в смену.

${dateLine}
${monthLine}
${descLine}
  `.trim();

  // Если есть фотографии, отправляем первую с текстом как caption, остальные отдельно
  if (options.photoUrls && options.photoUrls.length > 0) {
    // Отправляем первую фотографию с текстом
    const firstPhotoSent = await sendTelegramPhoto({
      photoUrl: options.photoUrls[0],
      caption: message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });

    // Отправляем остальные фотографии без текста
    if (firstPhotoSent && options.photoUrls.length > 1) {
      for (let i = 1; i < options.photoUrls.length; i++) {
        try {
          await sendTelegramPhoto({
            photoUrl: options.photoUrls[i],
            botToken: options.botToken,
            chatId: options.chatId,
            topicId: options.topicId,
          });
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    return firstPhotoSent;
  } else {
    // Если фотографий нет, отправляем только текстовое сообщение
    const messageId = await sendTelegramMessage({
      message,
      botToken: options.botToken,
      chatId: options.chatId,
      topicId: options.topicId,
    });
    return messageId !== null;
  }
}

/**
 * Отправляет уведомление о долге
 */
export async function notifyDebt(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  productName: string;
  quantity: number;
  telegramTag?: string;
  topicId?: string;
}): Promise<boolean> {
  const tagLine = options.telegramTag ? options.telegramTag : `<b>${options.adminName}</b>`;
  const message = `
💳 <b>Новый долг</b>

Администратор: ${tagLine}
Товар: <b>${options.productName}</b>
Количество: <b>${options.quantity}</b>
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });
  return messageId !== null;
}

/**
 * Получает topic ID для типа отчета
 */
export function getTopicIdForReportType(reportType: string, settings?: any): string | undefined {
  if (!settings) return undefined;
  
  switch (reportType) {
    case "HOOKAH":
      return settings.topicHookah;
    case "CORK_FEE":
      return settings.topicCorkFee;
    case "PLAYSTATION":
      return settings.topicPlayStation;
    case "VAT_INVOICE":
      return settings.topicInvoice;
    case "PROMOTION":
      return settings.topicPromotion;
    case "TABLE_STATUS":
      return settings.topicTables;
    case "FINANCIAL":
      return settings.topicShift; // Используем топик смен для финансовых
    default:
      return undefined;
  }
}

/**
 * Отправляет уведомление о выданном штрафе
 */
export async function notifyPenalty(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  employeeName: string;
  shiftDate: Date | string;
  amount: number;
  reason: string;
  topicId?: string;
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Директор/Управляющий ${options.telegramTag}` : `Директор/Управляющий: <b>${options.adminName}</b>`;
  const employeeLine = `Сотрудник: <b>${options.employeeName}</b>`;
  const shiftDate = options.shiftDate instanceof Date 
    ? `${options.shiftDate.getDate().toString().padStart(2, '0')}.${(options.shiftDate.getMonth() + 1).toString().padStart(2, '0')}.${options.shiftDate.getFullYear()}`
    : options.shiftDate;
  const amountLine = `Сумма штрафа: <b>${options.amount} ₽</b>`;
  const reasonLine = options.reason ? `Причина: <b>${options.reason}</b>` : '';
  
  const message = `
${adminLine} выдал штраф сотруднику.

${employeeLine}
Дата смены: <b>${shiftDate}</b>
${amountLine}
${reasonLine}
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });
  return messageId !== null;
}

/**
 * Отправляет уведомление о выданном бонусе
 */
export async function notifyBonus(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  employeeName: string;
  shiftDate: Date | string;
  amount: number;
  reason: string;
  topicId?: string;
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Директор/Управляющий ${options.telegramTag}` : `Директор/Управляющий: <b>${options.adminName}</b>`;
  const employeeLine = `Сотрудник: <b>${options.employeeName}</b>`;
  const shiftDate = options.shiftDate instanceof Date 
    ? `${options.shiftDate.getDate().toString().padStart(2, '0')}.${(options.shiftDate.getMonth() + 1).toString().padStart(2, '0')}.${options.shiftDate.getFullYear()}`
    : options.shiftDate;
  const amountLine = `Сумма бонуса: <b>${options.amount} ₽</b>`;
  const reasonLine = options.reason ? `Причина: <b>${options.reason}</b>` : '';
  
  const message = `
${adminLine} выдал бонус сотруднику.

${employeeLine}
Дата смены: <b>${shiftDate}</b>
${amountLine}
${reasonLine}
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });
  return messageId !== null;
}

/**
 * Отправляет уведомление о выплате зарплаты
 */
export async function notifyPayment(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  employeeName: string;
  employeeTag?: string;
  amount: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  status: string;
  topicId?: string;
}): Promise<boolean> {
  const adminLine = options.telegramTag ? `Директор/Управляющий ${options.telegramTag}` : `Директор/Управляющий: <b>${options.adminName}</b>`;
  const employeeLine = options.employeeTag ? `Сотрудник ${options.employeeTag}` : `Сотрудник: <b>${options.employeeName}</b>`;
  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };
  const periodLine = `Период: <b>${formatDate(options.periodStart)} - ${formatDate(options.periodEnd)}</b>`;
  const amountLine = `Сумма: <b>${options.amount} ₽</b>`;
  const statusTranslations: Record<string, string> = {
    'PENDING': 'В процессе',
    'PAID': 'Выплачено',
    'CANCELLED': 'Отменено',
  };
  const statusLine = `Статус: <b>${statusTranslations[options.status] || options.status}</b>`;
  
  const message = `
${adminLine} ${options.status === 'PAID' ? 'выплатил зарплату' : 'изменил статус выплаты'}.

${employeeLine}
${periodLine}
${amountLine}
${statusLine}
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });
  return messageId !== null;
}

/**
 * Отправляет уведомление о новой задаче
 */
export async function notifyTask(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  employeeName: string;
  employeeTag?: string;
  taskTitle: string;
  taskDescription?: string;
  priority: string;
  dueDate?: Date | string;
  topicId?: string;
}): Promise<boolean> {
  const adminLine = `Директор/Управляющий: <b>${options.adminName}</b>`;
  const employeeLine = options.employeeTag 
    ? `Сотруднику ${options.employeeTag}` 
    : `Сотруднику: <b>${options.employeeName}</b>`;
  
  const priorityTranslations: Record<string, string> = {
    'LOW': 'Низкий',
    'MEDIUM': 'Средний',
    'HIGH': 'Высокий',
    'URGENT': 'Срочно',
  };
  const priorityLine = `Приоритет: <b>${priorityTranslations[options.priority] || options.priority}</b>`;
  
  const dueDateLine = options.dueDate 
    ? `\nСрок выполнения: <b>${options.dueDate instanceof Date ? options.dueDate.toLocaleDateString('ru-RU') : new Date(options.dueDate).toLocaleDateString('ru-RU')}</b>` 
    : '';
  
  const descriptionLine = options.taskDescription 
    ? `\n\nОписание:\n${options.taskDescription}` 
    : '';
  
  const message = `
📋 <b>Новая задача</b>

${adminLine} выдал задание администратору: ${options.employeeTag ? options.employeeTag : `<b>${options.employeeName}</b>`}

Задача: <b>${options.taskTitle}</b>${descriptionLine}

${priorityLine}${dueDateLine}
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });
  return messageId !== null;
}

/**
 * Отправляет уведомление о прохождении чек-листа
 */
export async function notifyChecklist(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  topicId?: string;
}): Promise<boolean> {
  const adminLine = options.telegramTag 
    ? `Администратор: ${options.telegramTag}` 
    : `Администратор: <b>${options.adminName}</b>`;
  
  const message = `
${adminLine} начал смену и прошел чек лист.
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });
  return messageId !== null;
}

/**
 * Отправляет уведомление о забытой вещи
 */
export async function notifyLostItem(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  pcNumber?: string;
  guestPhone?: string;
  guestName?: string;
  photos?: string[];
  topicId?: string;
}): Promise<number | null> {
  const adminLine = options.telegramTag 
    ? `Администратор: ${options.telegramTag}` 
    : `Администратор: <b>${options.adminName}</b>`;
  
  const pcLine = options.pcNumber ? `1. ПК/PS5: <b>${options.pcNumber}</b>` : '';
  const phoneLine = options.guestPhone ? `2. Номер гостя: <b>${options.guestPhone}</b>` : '';
  const nameLine = options.guestName ? `3. Имя гостя: <b>${options.guestName}</b>` : '';
  
  const message = `
${adminLine} добавил забытую вещь:

${pcLine}
${phoneLine}
${nameLine}
  `.trim();

  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });

  // Отправляем фотографии, если есть
  if (messageId && options.photos && options.photos.length > 0) {
    for (const photoUrl of options.photos) {
      try {
        await sendTelegramPhoto({
          photoUrl,
          botToken: options.botToken,
          chatId: options.chatId,
          topicId: options.topicId,
        });
      } catch (error) {
        console.error("Error sending photo:", error);
      }
    }
  }

  return messageId;
}

/**
 * Отправляет уведомление о том, что вещь забрали
 */
export async function notifyLostItemRetrieved(options: {
  botToken: string;
  chatId?: string;
  adminName: string;
  telegramTag?: string;
  originalMessageId?: number;
  topicId?: string;
}): Promise<boolean> {
  const adminLine = options.telegramTag 
    ? `Администратор: ${options.telegramTag}` 
    : `Администратор: <b>${options.adminName}</b>`;
  
  const message = `
${adminLine} отметил, что вещь забрали.
  `.trim();

  // Если есть ID оригинального сообщения, удаляем его
  if (options.originalMessageId !== undefined && options.originalMessageId !== null && options.chatId) {
    try {
      await deleteTelegramMessage({
        botToken: options.botToken,
        chatId: options.chatId,
        messageId: options.originalMessageId,
        topicId: options.topicId,
      });
    } catch (error) {
      console.error("Error deleting original message:", error);
      // Продолжаем отправку нового сообщения даже если удаление не удалось
    }
  }

  // Отправляем новое сообщение
  const messageId = await sendTelegramMessage({
    message,
    botToken: options.botToken,
    chatId: options.chatId,
    topicId: options.topicId,
  });

  return messageId !== null;
}

