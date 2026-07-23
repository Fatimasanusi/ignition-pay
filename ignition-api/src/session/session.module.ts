import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';
import { SessionController } from './session.controller';
// Issue #230: SessionGuard now resolves the JWT `scope` claim through
// PermissionsService, so we re-export it from the auth permissions module
// to keep the session module self-contained.
import { PermissionsService } from '../auth/permissions/permissions.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'stellaraid-default-secret'),
        signOptions: {
          expiresIn: `${config.get<number>('SESSION_ACCESS_TTL_SECONDS', 900)}s`,
        },
      }),
    }),
  ],
  controllers: [SessionController],
  providers: [SessionService, SessionGuard, PermissionsService],
  exports: [SessionService, SessionGuard, JwtModule, PermissionsService],
})
export class SessionModule {}
