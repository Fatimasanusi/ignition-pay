import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeyScopeGuard } from '../api-keys/api-key-scope.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeyExpirationService } from '../api-keys/api-key-expiration.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ApiKeyGuard, ApiKeyScopeGuard, ApiKeyExpirationService],
})
export class PaymentsModule {}
