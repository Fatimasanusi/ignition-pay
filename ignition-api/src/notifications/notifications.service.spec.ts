import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('create() persists a notification row', async () => {
    const expected = {
      id: 'n1',
      userId: 'u1',
      type: NotificationType.DONATION_RECEIVED,
      title: 'Donation received',
      message: 'Your campaign received 10 XLM.',
      relatedId: 'c1',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.notification.create.mockResolvedValue(expected);

    const result = await service.create({
      userId: 'u1',
      type: NotificationType.DONATION_RECEIVED,
      title: 'Donation received',
      message: 'Your campaign received 10 XLM.',
      relatedId: 'c1',
    });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        type: NotificationType.DONATION_RECEIVED,
        title: 'Donation received',
        message: 'Your campaign received 10 XLM.',
        relatedId: 'c1',
      },
    });
    expect(result).toEqual(expected);
  });

  it('findUnread() returns unread notifications ordered newest-first', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    await service.findUnread('u1');
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('markRead() updates a single notification', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
    await service.markRead('n1', 'u1');
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'u1' },
      data: { isRead: true },
    });
  });

  it('markAllRead() updates all unread notifications for a user', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
    await service.markAllRead('u1');
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isRead: false },
      data: { isRead: true },
    });
  });
});
