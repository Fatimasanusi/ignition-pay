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

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Fetch one extra row so we can tell whether another page exists
    // without running a separate COUNT query.
    const transactions = await this.prisma.transaction.findMany({
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
      orderBy: { createdAt: 'desc' },
      // When a cursor is supplied, start after that record.
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasNextPage = transactions.length > limit;
    const page = hasNextPage ? transactions.slice(0, limit) : transactions;

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

    const nextCursor = hasNextPage ? (page[page.length - 1]?.id ?? null) : null;

    return { data, nextCursor, hasNextPage, limit, total, page: (query as any).page ?? 1, limit, nextCursor, hasNextPage };
   
  }

  /**
   * Issue #244 — Idempotent transaction submission.
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
