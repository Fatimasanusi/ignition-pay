import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';




@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const rawIp =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress;

    if (typeof rawIp === 'string') {
      const parts = rawIp.split(',').map((ip: string) => ip.trim());
      return parts[0];
    }
    return req.ip || '127.0.0.1';
  }
}
