import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetTransactionsQueryDto,
  GetTransactionsResponseDto,
} from './dto/get-transactions.dto';

/**
 * Legal TransactionStatus transitions (Issue #247).
 *
 * Only these edges are permitted; any other change must be rejected.
 * The full directed graph is:
 *
 *   PENDING  → PROCESSING | FAILED | CANCELLED
 *   PROCESSING → COMPLETED | FAILED | CANCELLED
 *   COMPLETED → REFUNDED   (only via an explicit refund flow)
 *   FAILED    → (terminal — no further transitions)
 *   CANCELLED → (terminal — no further transitions)
 *   REFUNDED  → (terminal — no further transitions)
 */
const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.PENDING]: [
    TransactionStatus.PROCESSING,
    TransactionStatus.FAILED,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.PROCESSING]: [
    TransactionStatus.COMPLETED,
    TransactionStatus.FAILED,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.COMPLETED]: [TransactionStatus.REFUNDED],
  [TransactionStatus.FAILED]: [],
  [TransactionStatus.CANCELLED]: [],
  [TransactionStatus.REFUNDED]: [],
};

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a TransactionStatus transition and throw BadRequestException
   * if the transition is illegal.
   *
   * @throws BadRequestException when the transition from `from` → `to` is not in
   *         the allow-list defined by ALLOWED_TRANSITIONS.
   */
  assertLegalTransition(from: TransactionStatus, to: TransactionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Illegal status transition: ${from} → ${to}. ` +
          `Allowed transitions from ${from}: [${allowed.join(', ') || 'none — terminal state'}].`,
      );
    }
  }

  async getTransactions(
    query: GetTransactionsQueryDto,
  ): Promise<GetTransactionsResponseDto> {
    const { cursor, limit, dateFrom, dateTo, status, type } = query;

    const where: Prisma.DonationWhereInput = {};

    if (status) where.status = status as any;
    if (type) where.assetCode = { equals: type, mode: 'insensitive' };

    if (dateFrom || dateTo) {
      where.donatedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    // Cursor pagination: if a cursor (last seen donation ID) is provided,
    // skip past it. Prisma's `cursor` + `skip: 1` pattern efficiently seeks
    // to the row after the cursor without counting all preceding rows.
    const cursorArg: Prisma.DonationFindManyArgs['cursor'] = cursor
      ? { id: cursor }
      : undefined;

    const donations = await this.prisma.donation.findMany({
      where,
      select: {
        id: true,
        amount: true,
        assetCode: true,
        txHash: true,
        status: true,
        donorId: true,
        campaignId: true,
        donatedAt: true,
        confirmedAt: true,
        createdAt: true,
      },
      orderBy: { donatedAt: 'desc' },
      // Fetch one extra row to determine if a next page exists.
      take: limit + 1,
      ...(cursorArg && { cursor: cursorArg, skip: 1 }),
    });

    const hasNextPage = donations.length > limit;
    const page = donations.slice(0, limit);
    const nextCursor = hasNextPage ? page[page.length - 1]?.id : null;

    return {
      data: page.map((d) => ({
        ...d,
        amount: Number(d.amount),
        type: d.assetCode,
      })),
      nextCursor,
      hasNextPage,
      limit,
    };
  }
}
