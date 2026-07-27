import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from '../prisma/prisma.module'
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard'
import { Sep24Controller } from './sep24.controller'
import { Sep24Service } from './sep24.service'

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'stellaraid-default-secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [Sep24Controller],
  providers: [Sep24Service, JwtAuthGuard],
})
export class Sep24Module {}
