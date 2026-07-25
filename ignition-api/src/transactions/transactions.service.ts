import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetTransactionsQueryDto,
  GetTransactionsResponseDto,
} from './dto/get-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions(
    query: GetTransactionsQueryDto,
  ): Promise<GetTransactionsResponseDto> {
    const { page, limit, dateFrom, dateTo, status, type, asset, search } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.DonationWhereInput = {};

    if (status) where.status = status as any;

    // `type` was historically mapped to assetCode; `asset` is the new explicit filter.
    // When both are provided, `asset` wins.
    const assetFilter = asset ?? type;
    if (assetFilter) {
      where.assetCode = { equals: assetFilter, mode: 'insensitive' };
    }

    if (dateFrom || dateTo) {
      where.donatedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    // Free-text search: match on txHash (exact, case-insensitive) or donorId
    // (partial, for counterparty address look-up).
    if (search) {
      where.OR = [
        { txHash: { equals: search, mode: 'insensitive' } },
        { donorId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, donations] = await Promise.all([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
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
        skip,
        take: limit,
      }),
    ]);

    return {
      data: donations.map((d) => ({
        ...d,
        amount: Number(d.amount),
        type: d.assetCode,
      })),
      total,
      page,
      limit,
    };
  }
}
