import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horizon } from '@stellar/stellar-sdk';
import BigNumber from 'bignumber.js';
import { Wallet } from '../wallets/entities/wallet.entity';
import {
  BalanceDiscrepancy,
  ReconciliationStatus,
} from './entities/balance-discrepancy.entity';

@Injectable()
export class BalanceReconciliationService {
  private readonly logger = new Logger(BalanceReconciliationService.name);
  private readonly horizonServer: Horizon.Server;

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(BalanceDiscrepancy)
    private readonly discrepancyRepository: Repository<BalanceDiscrepancy>,
  ) {
    const horizonUrl =
      process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    this.horizonServer = new Horizon.Server(horizonUrl);
  }

  /**
   * Automated background reconciliation job scheduled every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async reconcileWalletBalances(): Promise<void> {
    this.logger.log('Starting automated wallet balance reconciliation job...');

    const wallets = await this.walletRepository.find({
      where: { isActive: true },
    });

    let flaggedCount = 0;

    for (const wallet of wallets) {
      try {
        const isDiscrepant = await this.reconcileWallet(wallet);
        if (isDiscrepant) {
          flaggedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to reconcile wallet ${wallet.id} (${wallet.stellarAddress}):`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Reconciliation job finished. Scanned: ${wallets.length}, Flagged Discrepancies: ${flaggedCount}`,
    );
  }

  /**
   * Reconciles a single wallet balance against Horizon account reserves
   */
  async reconcileWallet(wallet: Wallet): Promise<boolean> {
    const accountData = await this.horizonServer
      .loadAccount(wallet.stellarAddress)
      .catch((err) => {
        if (err?.response?.status === 404) {
          return null; // Account unfunded on-chain
        }
        throw err;
      });

    // Native XLM balance on-chain
    const nativeAsset = accountData?.balances.find(
      (b) => b.asset_type === 'native',
    );
    const onChainBalance = new BigNumber(nativeAsset ? nativeAsset.balance : '0.0000000');
    const dbBalance = new BigNumber(wallet.balance.toString());

    const driftAmount = dbBalance.minus(onChainBalance).abs();

    // Flag drift if difference exceeds acceptable threshold (e.g., 0.00001 XLM tolerance)
    const DRIFT_THRESHOLD = new BigNumber('0.00001');

    if (driftAmount.isGreaterThan(DRIFT_THRESHOLD)) {
      this.logger.warn(
        `Balance drift detected for Wallet ${wallet.id}! DB: ${dbBalance.toFixed(7)}, On-Chain: ${onChainBalance.toFixed(7)}`,
      );

      const discrepancy = this.discrepancyRepository.create({
        walletId: wallet.id,
        stellarAddress: wallet.stellarAddress,
        dbBalance: dbBalance.toFixed(7),
        onChainBalance: onChainBalance.toFixed(7),
        driftAmount: driftAmount.toFixed(7),
        status: ReconciliationStatus.PENDING,
      });

      await this.discrepancyRepository.save(discrepancy);
      return true;
    }

    return false;
  }
}