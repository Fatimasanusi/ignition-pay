import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetTransactionsQueryDto,
  GetTransactionsResponseDto,
  SubmitTransactionDto,
  TransactionDto,
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
    const { cursor, limit, dateFrom, dateTo, status, type, asset, search } =
      query;

    // ── Issue #411: Cursor pagination ──────────────────────────────────────
    // When `cursor` is provided, fetch transactions created after the cursor
    // (using created_at + id to avoid drift when new rows are inserted).
    // When omitted, fall back to page-based offset pagination for backward
    // compatibility.
    const useCursorPagination = !!cursor;

    const where: Prisma.TransactionWhereInput = {};

    if (status) where.status = status as any;
    // `type` was historically mapped to assetCode; `asset` is the new explicit filter.
    // When both are provided, `asset` wins.
    const assetFilter = asset ?? type;
    if (assetFilter) {
      where.assetCode = { equals: assetFilter, mode: 'insensitive' };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    // Free-text search: match on txHash (exact, case-insensitive) or donorId
    // (partial, for counterparty address look-up).
    if (search) {
      where.OR = [
        { stellarTxHash: { equals: search, mode: 'insensitive' } },
        { fromWalletId: { contains: search, mode: 'insensitive' } },
        { toWalletId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (useCursorPagination) {
      // Cursor pagination: seek past the cursor row using (createdAt, id)
      // compound key to avoid drift when new rows are inserted during paging.
      const cursorRow = await this.prisma.transaction.findUnique({
        where: { id: cursor! },
        select: { createdAt: true, id: true },
      });

      if (cursorRow) {
        where.AND = [
          ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
          {
            OR: [
              { createdAt: { lt: cursorRow.createdAt } },
              {
                createdAt: cursorRow.createdAt,
                id: { lt: cursorRow.id },
              },
            ],
          },
        ];
      }
    }

    const skip = useCursorPagination ? 0 : ((query as any).page - 1) * limit;

    const [total, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        select: {
          id: true,
          fromWalletId: true,
          toWalletId: true,
          amount: true,
          assetCode: true,
          stellarTxHash: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit + 1, // fetch one extra to detect next page
      }),
    ]);

    const hasNextPage = transactions.length > limit;
    const page = transactions.slice(0, limit);
    const nextCursor = hasNextPage ? page[page.length - 1]?.id ?? null : null;

    const data: TransactionDto[] = page.map((t) => ({
      id: t.id,
      fromWalletId: t.fromWalletId,
      toWalletId: t.toWalletId,
      // Issue #409: return amount as string to preserve Decimal precision.
      // Stellar uses 7-decimal stroops; floats risk rounding drift.
      amount: t.amount.toString(),
      assetCode: t.assetCode,
      stellarTxHash: t.stellarTxHash ?? null,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return { data, total, page: (query as any).page ?? 1, limit, nextCursor, hasNextPage };
  }

  /**
   * Issue #244 — Idempotent transaction submission.
   *
   * If a `stellarTxHash` is provided, we attempt to insert the record with
   * that unique hash.  On a unique-constraint violation (the hash already
   * exists), we return the existing row instead of creating a duplicate.
   * This ensures network-blip retries never produce double on-chain sends.
   *
   * If no `stellarTxHash` is supplied yet (hash not known at submission time),
   * the caller should update the row later (e.g. via the contract-events
   * processor) to set the hash and finalise the status.
   */
  async submitTransaction(
    dto: SubmitTransactionDto,
  ): Promise<TransactionDto & { alreadyExisted: boolean }> {
    if (!dto.fromWalletId || !dto.toWalletId) {
      throw new BadRequestException(
        'Both fromWalletId and toWalletId are required',
      );
    }

    // Idempotency check: if we already have a record with this hash, return it.
    if (dto.stellarTxHash) {
      const existing = await this.prisma.transaction.findUnique({
        where: { stellarTxHash: dto.stellarTxHash },
      });
      if (existing) {
        return {
          id: existing.id,
          fromWalletId: existing.fromWalletId,
          toWalletId: existing.toWalletId,
          amount: existing.amount.toString(),
          assetCode: existing.assetCode,
          stellarTxHash: existing.stellarTxHash ?? null,
          status: existing.status,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
          alreadyExisted: true,
        };
      }
    }

    try {
      const created = await this.prisma.transaction.create({
        data: {
          fromWalletId: dto.fromWalletId,
          toWalletId: dto.toWalletId,
          amount: dto.amount,
          assetCode: dto.assetCode ?? 'XLM',
          stellarTxHash: dto.stellarTxHash ?? null,
          status: 'PENDING',
        },
      });

      return {
        id: created.id,
        fromWalletId: created.fromWalletId,
        toWalletId: created.toWalletId,
        amount: created.amount.toString(),
        assetCode: created.assetCode,
        stellarTxHash: created.stellarTxHash ?? null,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        alreadyExisted: false,
      };
    } catch (err: any) {
      // Handle race condition: another request inserted the same hash between
      // our read and write above.  Treat as idempotent success.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        dto.stellarTxHash
      ) {
        const existing = await this.prisma.transaction.findUnique({
          where: { stellarTxHash: dto.stellarTxHash },
        });
        if (existing) {
          return {
            id: existing.id,
            fromWalletId: existing.fromWalletId,
            toWalletId: existing.toWalletId,
            amount: existing.amount.toString(),
            assetCode: existing.assetCode,
            stellarTxHash: existing.stellarTxHash ?? null,
            status: existing.status,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
            alreadyExisted: true,
          };
        }
        throw new ConflictException(
          'A transaction with this Stellar tx hash already exists',
        );
      }
      throw err;
    }
  }
}
