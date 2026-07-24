import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyScopeGuard } from './api-key-scope.guard';
import { ApiKeyExpirationService } from './api-key-expiration.service';
import { AdminGuard } from '../users/guards/admin.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ApiKeysController],
  providers: [
    ApiKeyGuard,
    ApiKeyScopeGuard,
    ApiKeyExpirationService,
    AdminGuard,
  ],
  exports: [ApiKeyGuard, ApiKeyScopeGuard, ApiKeyExpirationService],
})
export class ApiKeysModule {}
