import {
  Injectable,
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

    // amount validity (range, precision) is enforced by @IsDecimalAmount on
    // CreatePaymentDto — no redundant guard needed here.
    const { feeAmount, feeAssetCode } = await this.estimateFee();

    return {
      id: crypto.randomUUID(),
      status: 'queued',
      recipientAddress: dto.recipientAddress,
      amount: dto.amount,
      assetCode: dto.assetCode,
      feeAmount,
      feeAssetCode,
      createdAt: new Date().toISOString(),
    };
  }
}
