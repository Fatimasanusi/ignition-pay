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
    const { page, limit, dateFrom, dateTo, status, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (status) where.status = status as any;
    // `type` maps to assetCode in the Transaction model (e.g. "XLM", "USDC").
    if (type) where.assetCode = { equals: type, mode: 'insensitive' };

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data: TransactionDto[] = transactions.map((t) => ({
      id: t.id,
      fromWalletId: t.fromWalletId,
      toWalletId: t.toWalletId,
      amount: Number(t.amount),
      assetCode: t.assetCode,
      stellarTxHash: t.stellarTxHash ?? null,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return { data, total, page, limit };
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
          amount: Number(existing.amount),
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
        amount: Number(created.amount),
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
            amount: Number(existing.amount),
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
