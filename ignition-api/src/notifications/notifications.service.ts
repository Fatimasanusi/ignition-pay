import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** ID of the related resource (campaign, donation, milestone …) */
  relatedId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist a notification row.
   * Called by the Horizon SSE consumer and any other domain event producers.
   */
  async create(params: CreateNotificationParams) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedId: params.relatedId,
      },
    });

    this.logger.log(
      `Notification created: ${notification.id} [${notification.type}] for user ${params.userId}`,
    );

    return notification;
  }

  /**
   * Persist many notification rows in a single query.
   *
   * Fan-out to many recipients previously meant one sequential `create()`
   * round-trip per notification (O(n) DB calls); this batches them into a
   * single `createMany` insert so the cost is one round-trip regardless of
   * how many notifications are emitted (issue #442).
   */
  async createMany(paramsList: CreateNotificationParams[]) {
    if (paramsList.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.notification.createMany({
      data: paramsList.map((params) => ({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedId: params.relatedId,
      })),
    });

    this.logger.log(
      `Notifications batched: ${result.count} row(s) in a single insert`,
    );

    return result;
  }

  /** Return all unread notifications for a user, newest first. */
  async findUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Mark a single notification as read. */
  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /** Mark all unread notifications as read for a user. */
  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
