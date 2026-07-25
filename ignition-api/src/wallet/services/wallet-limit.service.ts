import {
  Injectable,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import BigNumber from 'bignumber.js';
import { Wallet } from '../entities/wallet.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../transactions/entities/transaction.entity';

@Injectable()
export class WalletLimitService {
  private readonly logger = new Logger(WalletLimitService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Enforces rolling 24-hour and 30-day outgoing transfer limits for a given wallet.
   * Throws UnprocessableEntityException if the new transaction exceeds limits.
   */
  async validateTransactionLimits(
    wallet: Wallet,
    outgoingAmountStr: string,
  ): Promise<void> {
    const outgoingAmount = new BigNumber(outgoingAmountStr);

    if (outgoingAmount.isLessThanOrEqualTo(0)) {
      return;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Evaluate Rolling 24-Hour Daily Limit
    if (wallet.dailyLimit) {
      const dailyLimitBN = new BigNumber(wallet.dailyLimit);

      const dailySpentBN = await this.getSumOfOutgoingTransactions(
        wallet.id,
        twentyFourHoursAgo,
        now,
      );

      const projectedDailyTotal = dailySpentBN.plus(outgoingAmount);

      if (projectedDailyTotal.isGreaterThan(dailyLimitBN)) {
        this.logger.warn(
          `Wallet ${wallet.id} exceeded daily limit. Limit: ${dailyLimitBN.toFixed(7)}, Rolling 24h Spent: ${dailySpentBN.toFixed(7)}, Attempted: ${outgoingAmount.toFixed(7)}`,
        );

        throw new UnprocessableEntityException(
          `Transaction exceeds 24-hour rolling daily limit of ${dailyLimitBN.toFixed(2)} XLM. Remaining: ${BigNumber.max(0, dailyLimitBN.minus(dailySpentBN)).toFixed(2)} XLM.`,
        );
      }
    }

    // 2. Evaluate Rolling 30-Day Monthly Limit
    if (wallet.monthlyLimit) {
      const monthlyLimitBN = new BigNumber(wallet.monthlyLimit);

      const monthlySpentBN = await this.getSumOfOutgoingTransactions(
        wallet.id,
        thirtyDaysAgo,
        now,
      );

      const projectedMonthlyTotal = monthlySpentBN.plus(outgoingAmount);

      if (projectedMonthlyTotal.isGreaterThan(monthlyLimitBN)) {
        this.logger.warn(
          `Wallet ${wallet.id} exceeded monthly limit. Limit: ${monthlyLimitBN.toFixed(7)}, Rolling 30d Spent: ${monthlySpentBN.toFixed(7)}, Attempted: ${outgoingAmount.toFixed(7)}`,
        );

        throw new UnprocessableEntityException(
          `Transaction exceeds 30-day rolling monthly limit of ${monthlyLimitBN.toFixed(2)} XLM. Remaining: ${BigNumber.max(0, monthlyLimitBN.minus(monthlySpentBN)).toFixed(2)} XLM.`,
        );
      }
    }
  }

  /**
   * Sums all successful or pending outgoing transactions within a rolling date window.
   */
  private async getSumOfOutgoingTransactions(
    walletId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<BigNumber> {
    const result = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('SUM(CAST(tx.amount AS DECIMAL))', 'totalSpent')
      .where('tx.sourceWalletId = :walletId', { walletId })
      .andWhere('tx.createdAt BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .andWhere('tx.status IN (:...statuses)', {
        statuses: [TransactionStatus.COMPLETED, TransactionStatus.PENDING],
      })
      .andWhere('tx.type IN (:...types)', {
        types: [TransactionType.PAYMENT, TransactionType.WITHDRAWAL],
      })
      .getRawOne();

    return new BigNumber(result?.totalSpent || '0');
  }
}