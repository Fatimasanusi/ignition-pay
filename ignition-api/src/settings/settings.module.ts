import { Module, forwardRef } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => SessionModule), // Handle circular dependency
  ],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService], // Export so other modules can use it
})
export class SettingsModule {}