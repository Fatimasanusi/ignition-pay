import { ConflictException, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTransaction = (overrides: any = {}) => ({
  id: 'txn-1',
  fromWalletId: 'wallet-from',
  toWalletId: 'wallet-to',
  amount: { toNumber: () => 50, valueOf: () => 50 } as any,
  assetCode: 'XLM',
  stellarTxHash: 'abc123hash',
  status: 'PENDING',
  createdAt: new Date('2026-01-15T10:00:00Z'),
  updatedAt: new Date('2026-01-15T10:00:00Z'),
  ...overrides,
});

const buildPrisma = (txns: any[] = [makeTransaction()], total = 1) => ({
  transaction: {
    count: jest.fn().mockResolvedValue(total),
    findMany: jest.fn().mockResolvedValue(txns),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(({ data }: any) => ({
      ...makeTransaction(),
      ...data,
      id: 'new-txn',
    })),
  },
});

// ---------------------------------------------------------------------------
// Tests: getTransactions
// ---------------------------------------------------------------------------

describe('TransactionsService.getTransactions', () => {
  let service: TransactionsService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(() => {
    prisma = buildPrisma();
    // @ts-ignore
    service = new TransactionsService(prisma);
  });

  it('returns paginated transactions with defaults', async () => {
    const result = await service.getTransactions({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
  });

  it('maps amount to number and exposes stellarTxHash', async () => {
    const result = await service.getTransactions({ page: 1, limit: 10 });
    expect(result.data[0].amount).toBe(50);
    expect(result.data[0].stellarTxHash).toBe('abc123hash');
  });

  it('applies status filter', async () => {
    await service.getTransactions({ page: 1, limit: 10, status: 'PENDING' });
    expect(prisma.transaction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
  });

  it('applies date range filter', async () => {
    await service.getTransactions({
      page: 1,
      limit: 10,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    const callArg = prisma.transaction.count.mock.calls[0][0];
    expect(callArg.where.createdAt.gte).toEqual(new Date('2026-01-01'));
    expect(callArg.where.createdAt.lte).toEqual(new Date('2026-01-31'));
  });

  it('applies type filter via assetCode', async () => {
    await service.getTransactions({ page: 1, limit: 10, type: 'USDC' });
    expect(prisma.transaction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assetCode: { equals: 'USDC', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('calculates correct skip for page 2', async () => {
    await service.getTransactions({ page: 2, limit: 5 });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
  });

  it('returns empty data array when no transactions', async () => {
    // @ts-ignore
    service = new TransactionsService(buildPrisma([], 0));
    const result = await service.getTransactions({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: submitTransaction (Issue #244 — idempotent submission)
// ---------------------------------------------------------------------------

describe('TransactionsService.submitTransaction', () => {
  let service: TransactionsService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(() => {
    prisma = buildPrisma();
    // @ts-ignore
    service = new TransactionsService(prisma);
  });

  it('creates a new transaction when no hash conflict exists', async () => {
    const dto = {
      fromWalletId: 'wallet-from',
      toWalletId: 'wallet-to',
      amount: '50.0000000',
      assetCode: 'XLM',
      stellarTxHash: 'unique-hash',
    };

    prisma.transaction.findUnique.mockResolvedValue(null);

    const result = await service.submitTransaction(dto);
    expect(result.alreadyExisted).toBe(false);
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromWalletId: 'wallet-from',
          toWalletId: 'wallet-to',
          stellarTxHash: 'unique-hash',
          status: 'PENDING',
        }),
      }),
    );
  });

  it('returns existing transaction when same stellarTxHash is submitted again (idempotent)', async () => {
    const existingTx = makeTransaction({ id: 'existing-id', stellarTxHash: 'dup-hash' });
    prisma.transaction.findUnique.mockResolvedValue(existingTx);

    const result = await service.submitTransaction({
      fromWalletId: 'wallet-from',
      toWalletId: 'wallet-to',
      amount: '50.0000000',
      stellarTxHash: 'dup-hash',
    });

    expect(result.alreadyExisted).toBe(true);
    expect(result.id).toBe('existing-id');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('handles P2002 race condition and returns the existing record', async () => {
    const existingTx = makeTransaction({ id: 'race-id', stellarTxHash: 'race-hash' });
    prisma.transaction.findUnique
      .mockResolvedValueOnce(null)   // first check — not found
      .mockResolvedValueOnce(existingTx); // second check after P2002

    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '5.0' },
    );
    prisma.transaction.create.mockRejectedValue(p2002);

    const result = await service.submitTransaction({
      fromWalletId: 'wallet-from',
      toWalletId: 'wallet-to',
      amount: '50.0000000',
      stellarTxHash: 'race-hash',
    });

    expect(result.alreadyExisted).toBe(true);
    expect(result.id).toBe('race-id');
  });

  it('throws BadRequestException when fromWalletId is missing', async () => {
    await expect(
      service.submitTransaction({
        fromWalletId: '',
        toWalletId: 'wallet-to',
        amount: '50.0000000',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates transaction without stellarTxHash (hash not yet known)', async () => {
    const result = await service.submitTransaction({
      fromWalletId: 'wallet-from',
      toWalletId: 'wallet-to',
      amount: '10.0000000',
    });
    expect(result.alreadyExisted).toBe(false);
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stellarTxHash: null }),
      }),
    );
  });
});
