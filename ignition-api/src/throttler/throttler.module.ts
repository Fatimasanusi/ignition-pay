import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerRedisStorage } from './throttler-redis.storage';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_DEFAULT_TTL', 60_000),
            limit: config.get<number>('THROTTLE_DEFAULT_LIMIT', 100),
          },
          {
            name: 'strict',
            ttl: config.get<number>('THROTTLE_STRICT_TTL', 60_000),
            limit: config.get<number>('THROTTLE_STRICT_LIMIT', 5),
          },
        ],
        storage: new ThrottlerRedisStorage(config),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class AppThrottlerModule {}
