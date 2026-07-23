import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyExpirationService } from './api-key-expiration.service';
//guard to protect api routes with api keys. The key is sent in the x-api-key header and is hashed and compared to the database. If valid, the user information is attached to the request object for use in the route handlers.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expirationService: ApiKeyExpirationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: unknown }>();

    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const record = await this.prisma.apiKey.findUnique({
      where: { keyHash, isActive: true },
      include: {
        user: { select: { id: true, walletAddress: true, role: true } },
      },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    if (record.expiresAt && record.expiresAt <= new Date()) {
      await this.prisma.apiKey.update({
        where: { id: record.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('API key has expired');
    }

    await this.expirationService.touchUsage(record.id);

    request.user = {
      id: record.user.id,
      walletAddress: record.user.walletAddress,
      role: record.user.role,
      apiKeyId: record.id,
      scope: record.scope,
    };

    return true;
  }
}
