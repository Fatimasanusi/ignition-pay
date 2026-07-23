import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyExpirationService } from './api-key-expiration.service';
import { ApiKeyExpirationService } from './api-key-expiration.service';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let prisma: { apiKey: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      apiKey: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyGuard, { provide: PrismaService, useValue: prisma }],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if x-api-key header is missing', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing X-API-Key header'),
    );
  });

  it('should throw UnauthorizedException if API key record is missing or inactive', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-api-key': 'my-key' },
        }),
      }),
    } as unknown as ExecutionContext;

    prisma.apiKey.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or revoked API key'),
    );

    prisma.apiKey.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or revoked API key'),
    );
  });

  it('should return true and attach user if API key is active', async () => {
    const req = {
      headers: { 'x-api-key': 'my-key' },
      user: null as any,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    const mockRecord = {
      id: 'key-1',
      isActive: true,
      scope: 'ALL',
      user: {
        id: 'user-1',
        walletAddress: 'G123',
        role: 'USER',
      },
    };
    prisma.apiKey.findUnique.mockResolvedValue(mockRecord);

    const res = await guard.canActivate(context);

    expect(res).toBe(true);
    expect(req.user).toEqual({
      id: 'user-1',
      walletAddress: 'G123',
      role: 'USER',
      apiKeyId: 'key-1',
      scope: 'ALL',
    });
    const keyHash = createHash('sha256').update('my-key').digest('hex');
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
      where: { keyHash, isActive: true },
      include: {
        user: { select: { id: true, walletAddress: true, role: true } },
      },
    });
  });
});
