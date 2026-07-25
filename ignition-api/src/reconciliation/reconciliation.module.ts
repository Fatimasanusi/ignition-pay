import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Wallet } from '../wallets/entities/wallet.entity';
import { BalanceDiscrepancy } from './entities/balance-discrepancy.entity';
import { BalanceReconciliationService } from './balance-reconciliation.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Wallet, BalanceDiscrepancy]),
  ],
  providers: [BalanceReconciliationService],
  exports: [BalanceReconciliationService],
})
export class ReconciliationModule {}