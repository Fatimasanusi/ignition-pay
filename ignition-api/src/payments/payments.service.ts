import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import BigNumber from 'bignumber.js';
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QUEUE_PAYMENTS } from '../queue/queue.constants';
import {
  PAYMENT_JOB_PROCESS,
  PaymentJobPayload,
} from '../queue/queue.jobs';

export interface EstimatedFee {
  feeAmount: string;
  feeAssetCode: string;
}

/**
 * Response shape for the Horizon `/fee_stats` endpoint.
 * We only map the fields we actually consume.
 */
interface HorizonFeeStats {
  last_ledger_base_fee: string; // base fee in stroops (1 XLM = 10_000_000 stroops)
  fee_charged: {
    p50: string; // median fee charged in last 5 ledgers (stroops)
    p90: string;
    p95: string;
    p99: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_PAYMENTS) private readonly paymentQueue: Queue<PaymentJobPayload>,
  ) {}

  async initiatePayment(dto: CreatePaymentDto) {
    // ── 1. Validate sender wallet ────────────────────────────────────────────
    const senderWallet = await this.prisma.wallet.findUnique({
      where: { id: dto.senderWalletId },
    });

    if (!senderWallet || !senderWallet.isActive) {
      throw new NotFoundException(
        `Sender wallet ${dto.senderWalletId} not found or inactive`,
      );
    }

    // ── 2. Enforce rolling transfer limits ───────────────────────────────────
    await this.validateTransactionLimits(senderWallet, dto.amount);

    // ── 3. Persist Transaction record (status: PENDING) ─────────────────────
    //
    // The Transaction model requires both a fromWallet and a toWallet FK.
    // For external Stellar addresses the recipient may not have an internal
    // wallet row, so we look up (or skip) a matching wallet by depositAddress.
    // If none exists we still record the intent: toWalletId falls back to the
    // sender's own wallet id as a self-reference placeholder that keeps the DB
    // constraint satisfied until a proper "external address" model is added.
    const recipientWallet = await this.prisma.wallet.findUnique({
      where: { depositAddress: dto.recipientAddress },
    });

    const transaction = await this.prisma.transaction.create({
      data: {
        fromWalletId: dto.senderWalletId,
        toWalletId: recipientWallet?.id ?? dto.senderWalletId,
        amount: dto.amount,
        assetCode: dto.assetCode,
        status: 'PENDING',
        metadata: {
          ...(recipientWallet
            ? {}
            : { externalRecipientAddress: dto.recipientAddress }),
          // Issue #408: store idempotency key so duplicate-initiation guard
          // can detect retries within the de-dup window.
          idempotencyKey: effectiveKey,
        },
      },
    });

    // ── 4. Enqueue processing job ────────────────────────────────────────────
    await this.paymentQueue.add(PAYMENT_JOB_PROCESS, {
      transactionId: transaction.id,
      senderWalletId: dto.senderWalletId,
      recipientAddress: dto.recipientAddress,
      amount: dto.amount,
      assetCode: dto.assetCode,
    } satisfies PaymentJobPayload);

    this.logger.log(
      `Payment queued: txn=${transaction.id} from=${dto.senderWalletId} ` +
        `to=${dto.recipientAddress} amount=${dto.amount} ${dto.assetCode}`,
    );

  private readonly horizonUrl: string;

  constructor(private readonly config: ConfigService) {
    this.horizonUrl = this.config.get<string>(
      'HORIZON_URL',
      'https://horizon.stellar.org',
    );
  }

  /**
   * Fetch the current recommended network fee from Horizon (Issue #245).
   *
   * Uses the p50 (median) fee from the last 5 ledgers, converted from
   * stroops to XLM (1 XLM = 10_000_000 stroops), and returned as a
   * 7-decimal fixed-point string to match the Stellar decimal precision
   * convention used throughout this codebase.
   *
   * Falls back to the Stellar minimum base fee (100 stroops = 0.00001 XLM)
   * if Horizon is unreachable.
   */
  async estimateFee(): Promise<EstimatedFee> {
    try {
      const res = await fetch(`${this.horizonUrl}/fee_stats`);
      if (!res.ok) {
        throw new Error(`Horizon /fee_stats responded ${res.status}`);
      }
      const stats: HorizonFeeStats = await res.json();

      // p50 is the median fee in stroops across recent ledgers — a good
      // balance between reliability and cost.
      const stroops = parseInt(stats.fee_charged?.p50 ?? stats.last_ledger_base_fee, 10);
      if (!Number.isFinite(stroops) || stroops < 0) {
        throw new Error(`Unexpected stroops value: ${stroops}`);
      }

      // Convert stroops → XLM with 7 decimal precision
      const xlm = (stroops / 10_000_000).toFixed(7);

      return { feeAmount: xlm, feeAssetCode: 'XLM' };
    } catch (err) {
      this.logger.warn(
        `Fee estimation from Horizon failed, using fallback: ${(err as Error).message}`,
      );
      // 100 stroops = 0.00001 XLM — Stellar's minimum base fee
      return { feeAmount: '0.0000100', feeAssetCode: 'XLM' };
    }
  }

  /**
   * Initiate a payment. Fetches the current network fee from Horizon
   * and includes it in the response so callers can show it before
   * the user confirms (Issue #245).
   */
  async initiatePayment(dto: CreatePaymentDto) {
  constructor(private readonly prisma: PrismaService) {}

  async initiatePayment(senderWalletId: string, dto: CreatePaymentDto) {
    // Fetch the sender wallet and verify it exists.
    const senderWallet = await this.prisma.wallet.findUnique({
      where: { id: senderWalletId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    // Issue #242: Reject outgoing transactions when the wallet is SUSPENDED.
    if (senderWallet.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Outgoing transactions are not allowed: wallet is suspended',
      );
    }

    if (senderWallet.status === 'CLOSED') {
      throw new ForbiddenException(
        'Outgoing transactions are not allowed: wallet is closed',
      );
    }

    // ── Issue #408: Idempotency guard ─────────────────────────────────────
    // Reject duplicate initiation when the same idempotency key was already
    // used for a recent PENDING transaction. This prevents network-retry
    // double-submits from creating duplicate on-chain payments.
    const effectiveKey =
      dto.idempotencyKey ?? `${senderWalletId}:${dto.recipientAddress}:${dto.amount}:${dto.assetCode}`;
    const recentWindowMs = 60 * 1000; // 60-second de-dup window
    const windowStart = new Date(Date.now() - recentWindowMs);

    const existingPending = await this.prisma.transaction.findFirst({
      where: {
        fromWalletId: senderWalletId,
        status: 'PENDING',
        createdAt: { gte: windowStart },
        metadata: {
          path: ['idempotencyKey'],
          equals: effectiveKey,
        },
      },
    });

    if (existingPending) {
      this.logger.warn(
        `Duplicate payment rejected (idempotencyKey=${effectiveKey}): ` +
          `existing txn=${existingPending.id}`,
      );
      throw new UnprocessableEntityException(
        `A payment with idempotency key '${effectiveKey}' is already being processed (txn=${existingPending.id}).`,
      );
    }

    // amount validity (range, precision) is enforced by @IsDecimalAmount on
    // CreatePaymentDto — no redundant guard needed here.
    const { feeAmount, feeAssetCode } = await this.estimateFee();

    return {
      id: transaction.id,
      status: 'queued',
      senderWalletId: dto.senderWalletId,
      recipientAddress: dto.recipientAddress,
      amount: dto.amount,
      assetCode: dto.assetCode,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Enforces rolling 24-hour and 30-day outgoing transfer limits for a wallet.
   * Uses Prisma aggregation over transactions with PENDING or COMPLETED status.
   */
  private async validateTransactionLimits(
    wallet: { id: string; dailyLimit: unknown; monthlyLimit: unknown },
    outgoingAmountStr: string,
  ): Promise<void> {
    const outgoing = new BigNumber(outgoingAmountStr);
    if (outgoing.isLessThanOrEqualTo(0)) return;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sumOutgoing = async (since: Date): Promise<BigNumber> => {
      const result = await this.prisma.transaction.aggregate({
        where: {
          fromWalletId: wallet.id,
          status: { in: ['PENDING', 'COMPLETED'] },
          createdAt: { gte: since },
        },
        _sum: { amount: true },
      });
      return new BigNumber(result._sum.amount?.toString() ?? '0');
    };

    // Rolling 24-hour limit
    if (wallet.dailyLimit != null) {
      const dailyLimit = new BigNumber(wallet.dailyLimit as string);
      const dailySpent = await sumOutgoing(oneDayAgo);
      if (dailySpent.plus(outgoing).isGreaterThan(dailyLimit)) {
        const remaining = BigNumber.max(0, dailyLimit.minus(dailySpent));
        this.logger.warn(
          `Wallet ${wallet.id} exceeded daily limit — ` +
            `limit=${dailyLimit.toFixed(7)} spent=${dailySpent.toFixed(7)} attempted=${outgoing.toFixed(7)}`,
        );
        throw new UnprocessableEntityException(
          `Transaction exceeds 24-hour rolling daily limit of ${dailyLimit.toFixed(2)}. ` +
            `Remaining: ${remaining.toFixed(2)}.`,
        );
      }
    }

    // Rolling 30-day limit
    if (wallet.monthlyLimit != null) {
      const monthlyLimit = new BigNumber(wallet.monthlyLimit as string);
      const monthlySpent = await sumOutgoing(thirtyDaysAgo);
      if (monthlySpent.plus(outgoing).isGreaterThan(monthlyLimit)) {
        const remaining = BigNumber.max(0, monthlyLimit.minus(monthlySpent));
        this.logger.warn(
          `Wallet ${wallet.id} exceeded monthly limit — ` +
            `limit=${monthlyLimit.toFixed(7)} spent=${monthlySpent.toFixed(7)} attempted=${outgoing.toFixed(7)}`,
        );
        throw new UnprocessableEntityException(
          `Transaction exceeds 30-day rolling monthly limit of ${monthlyLimit.toFixed(2)}. ` +
            `Remaining: ${remaining.toFixed(2)}.`,
        );
      }
    }
  }
      feeAmount,
      feeAssetCode,
      createdAt: new Date().toISOString(),
    };
  }
}
