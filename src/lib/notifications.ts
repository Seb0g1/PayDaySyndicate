import { prisma } from "./prisma";

export type NotificationType = 
  | "report" 
  | "shift" 
  | "task" 
  | "payment" 
  | "penalty" 
  | "bonus" 
  | "hookah"
  | "debt"
  | "shortage"
  | "checklist"
  | "memo"
  | "lost_item"
  | "other";

export interface CreateNotificationOptions {
  userId: string;
  employeeId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Создает уведомление для пользователя
 */
export async function createNotification(options: CreateNotificationOptions) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: options.userId,
        employeeId: options.employeeId,
        type: options.type,
        title: options.title,
        message: options.message,
        link: options.link,
        read: false,
        soundPlayed: false,
      },
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Создает уведомления для нескольких пользователей
 */
export async function createNotificationsForUsers(
  userIds: string[],
  options: Omit<CreateNotificationOptions, "userId">
) {
  try {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        createNotification({
          ...options,
          userId,
        })
      )
    );
    return notifications.filter((n) => n !== null);
  } catch (error) {
    console.error("Error creating notifications for users:", error);
    return [];
  }
}

/**
 * Создает уведомление для сотрудника (находит пользователя по employeeId)
 */
export async function createNotificationForEmployee(
  employeeId: string,
  options: Omit<CreateNotificationOptions, "userId" | "employeeId">
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee?.user) {
      console.warn(`No user found for employee ${employeeId}`);
      return null;
    }

    return await createNotification({
      ...options,
      userId: employee.user.id,
      employeeId,
    });
  } catch (error) {
    console.error("Error creating notification for employee:", error);
    return null;
  }
}

/**
 * Создает уведомления для всех директоров
 */
export async function createNotificationForDirectors(
  options: Omit<CreateNotificationOptions, "userId">
) {
  try {
    const directors = await prisma.user.findMany({
      where: { role: "DIRECTOR" },
    });

    return await createNotificationsForUsers(
      directors.map((d) => d.id),
      options
    );
  } catch (error) {
    console.error("Error creating notifications for directors:", error);
    return [];
  }
}

