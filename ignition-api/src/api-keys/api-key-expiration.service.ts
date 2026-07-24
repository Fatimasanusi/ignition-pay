import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyExpirationService {
  private readonly logger = new Logger(ApiKeyExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get expiryMs(): number {
    const configured = this.config.get<string>('API_KEY_TTL_MS');
    const parsed = Number(configured ?? 30 * 24 * 60 * 60 * 1000);

    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : 30 * 24 * 60 * 60 * 1000;
  }

  async deactivateExpiredKeys(): Promise<number> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.expiryMs);

    const result = await this.prisma.apiKey.updateMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: { lte: now } }, { lastUsedAt: { lte: cutoff } }],
      },
      data: {
        isActive: false,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deactivated ${result.count} stale API key(s)`);
    }

    return result.count;
  }

  async touchUsage(keyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    });
  }
}
