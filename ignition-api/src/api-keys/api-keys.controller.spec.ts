import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeysController } from './api-keys.controller';

describe('ApiKeysController', () => {
  let controller: ApiKeysController;
  let prisma: {
    apiKey: {
      create: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      apiKey: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    controller = new ApiKeysController(prisma as unknown as PrismaService);
  });

  it('creates a new API key for the authenticated user', async () => {
    prisma.apiKey.findFirst.mockResolvedValue(null);
    prisma.apiKey.create.mockResolvedValue({
      id: 'api-key-1',
      prefix: 'sk_12345678',
      scope: 'read',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await controller.create({
      user: {
        sub: 'user-1',
        walletAddress: 'GABC',
        role: 'USER',
      },
    } as never);

    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          scope: 'read',
          prefix: expect.stringMatching(/^sk_/),
          keyHash: expect.any(String),
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'ADMIN_ACTION',
          resourceType: 'ApiKey',
          resourceId: 'api-key-1',
          details: expect.stringContaining('CREATED'),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'api-key-1',
        key: expect.stringMatching(/^sk_/),
        prefix: 'sk_12345678',
        scope: 'read',
      }),
    );
  });

  it('rejects creating a new API key when an active key already uses the generated prefix', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({
      id: 'api-key-existing',
      prefix: 'sk_12345678',
      isActive: true,
    });

    await expect(
      controller.create({
        user: {
          sub: 'user-1',
          walletAddress: 'GABC',
          role: 'USER',
        },
      } as never),
    ).rejects.toThrow('An active API key already exists for this prefix');
  });

  it('revokes an owned API key and hides ownership details', async () => {
    prisma.apiKey.updateMany.mockResolvedValue({ count: 1 });

    const result = await controller.revoke('api-key-1', {
      user: {
        sub: 'user-1',
        walletAddress: 'GABC',
        role: 'USER',
      },
    } as never);

    expect(prisma.apiKey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'api-key-1',
          userId: 'user-1',
        },
        data: {
          isActive: false,
        },
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'ADMIN_ACTION',
          resourceType: 'ApiKey',
          resourceId: 'api-key-1',
          details: expect.stringContaining('REVOKED'),
        }),
      }),
    );
    expect(result).toEqual({ message: 'API key revoked successfully' });
  });

  it('returns not found when the key does not exist or is not owned by the caller', async () => {
    prisma.apiKey.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      controller.revoke('api-key-1', {
        user: {
          sub: 'user-2',
          walletAddress: 'GDEF',
          role: 'USER',
        },
      } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('lists all API keys for the authenticated user', async () => {
    prisma.apiKey.findMany.mockResolvedValue([
      {
        id: 'api-key-1',
        name: 'Production Key',
        prefix: 'sk_12345678',
        scope: 'read',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await controller.list({
      user: {
        sub: 'user-1',
        walletAddress: 'GABC',
        role: 'USER',
      },
    } as never);

    expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    );
    expect(result).toEqual({
      apiKeys: [
        expect.objectContaining({
          id: 'api-key-1',
          name: 'Production Key',
        }),
      ],
    });
  });

  it('lists API keys for a specific user as an admin', async () => {
    prisma.apiKey.findMany.mockResolvedValue([
      {
        id: 'api-key-1',
        name: 'Production Key',
        prefix: 'sk_12345678',
        scope: 'read',
        isActive: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsedAt: null,
        expiresAt: null,
      },
    ]);

    const result = await controller.listForUser('user-2');

    expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-2' },
      }),
    );
    expect(result).toEqual({
      userId: 'user-2',
      apiKeys: [
        expect.objectContaining({
          id: 'api-key-1',
          status: 'REVOKED',
        }),
      ],
    });
  });

  it('updates API key metadata', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({
      id: 'api-key-1',
      name: 'Old Name',
      prefix: 'sk_12345678',
      scope: 'read',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    prisma.apiKey.update.mockResolvedValue({
      id: 'api-key-1',
      name: 'New Name',
      prefix: 'sk_12345678',
      scope: 'read',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await controller.update('api-key-1', { name: 'New Name' }, {
      user: {
        sub: 'user-1',
        walletAddress: 'GABC',
        role: 'USER',
      },
    } as never);

    expect(prisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'api-key-1' },
        data: { name: 'New Name' },
      }),
    );
    expect(result.name).toBe('New Name');
  });

  it('returns not found when updating a non-existent key', async () => {
    prisma.apiKey.findFirst.mockResolvedValue(null);

    await expect(
      controller.update('api-key-1', { name: 'New Name' }, {
        user: {
          sub: 'user-1',
          walletAddress: 'GABC',
          role: 'USER',
        },
      } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('rotates an API key by creating new and revoking old', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({
      id: 'api-key-1',
      name: 'Production Key',
      prefix: 'sk_12345678',
      scope: 'read',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    prisma.apiKey.create.mockResolvedValue({
      id: 'api-key-2',
      name: 'Production Key',
      prefix: 'sk_87654321',
      scope: 'read',
      isActive: true,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    prisma.apiKey.update.mockResolvedValue({});

    const result = await controller.rotate('api-key-1', {
      user: {
        sub: 'user-1',
        walletAddress: 'GABC',
        role: 'USER',
      },
    } as never);

    expect(prisma.apiKey.create).toHaveBeenCalled();
    expect(prisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'api-key-1' },
        data: { isActive: false },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'api-key-2',
        key: expect.stringMatching(/^sk_/),
      }),
    );
  });

  it('returns not found when rotating a non-existent key', async () => {
    prisma.apiKey.findFirst.mockResolvedValue(null);

    await expect(
      controller.rotate('api-key-1', {
        user: {
          sub: 'user-1',
          walletAddress: 'GABC',
          role: 'USER',
        },
      } as never),
    ).rejects.toThrow(NotFoundException);
  });
});
