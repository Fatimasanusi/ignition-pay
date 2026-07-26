import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import {
  QUEUE_EMAIL,
  QUEUE_CONTRACT_EVENTS,
  QUEUE_ANALYTICS,
  QUEUE_PAYMENTS,
  QUEUE_HORIZON,
} from './queue.constants';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { ContractEventsProcessor } from './processors/contract-events.processor';
import { EmailProcessor } from './processors/email.processor';
import { PaymentProcessor } from './processors/payment.processor';
import { HorizonPollingProcessor } from './processors/horizon-polling.processor';
import { HorizonPollingScheduler } from './processors/horizon-polling.scheduler';
import { MilestoneProcessor } from './processors/milestone.processor';

const DEAD_LETTER_SETTINGS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
};

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL, defaultJobOptions: DEAD_LETTER_SETTINGS },
      { name: QUEUE_CONTRACT_EVENTS, defaultJobOptions: DEAD_LETTER_SETTINGS },
      { name: QUEUE_ANALYTICS, defaultJobOptions: DEAD_LETTER_SETTINGS },
      { name: QUEUE_PAYMENTS, defaultJobOptions: DEAD_LETTER_SETTINGS },
      { name: QUEUE_HORIZON, defaultJobOptions: DEAD_LETTER_SETTINGS },
    ),
    PrismaModule,
    ConfigModule,
  ],
  providers: [
    EmailProcessor,
    ContractEventsProcessor,
    AnalyticsProcessor,
    HorizonPollingProcessor,
    HorizonPollingScheduler,
  ],
  providers: [EmailProcessor, ContractEventsProcessor, AnalyticsProcessor, MilestoneProcessor],
  exports: [BullModule],
})
export class QueueModule {}
