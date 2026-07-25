import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeyScopeGuard } from '../api-keys/api-key-scope.guard';
import { ApiKeyExpirationService } from '../api-keys/api-key-expiration.service';

@Module({
  imports: [PrismaModule],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    PermissionsService,
    PermissionsGuard,
    ApiKeyGuard,
    ApiKeyScopeGuard,
    ApiKeyExpirationService,
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
