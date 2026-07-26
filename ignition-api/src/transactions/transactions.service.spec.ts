import { BadRequestException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Prisma } from '@prisma/client';

// ── Helper factories ──────────────────────────────────────────────────────────

const makeDonation = (overrides: any = {}) => ({
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

const buildPrisma = (donations: any[] = [makeDonation()]) => ({
  donation: {
    findMany: jest.fn().mockResolvedValue(donations),
  },
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransactionsService', () => {
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

  // ── Issue #247: Failure/refund state machine ────────────────────────────────

  describe('assertLegalTransition (Issue #247)', () => {
    describe('legal transitions', () => {
      it.each([
        [TransactionStatus.PENDING, TransactionStatus.PROCESSING],
        [TransactionStatus.PENDING, TransactionStatus.FAILED],
        [TransactionStatus.PENDING, TransactionStatus.CANCELLED],
        [TransactionStatus.PROCESSING, TransactionStatus.COMPLETED],
        [TransactionStatus.PROCESSING, TransactionStatus.FAILED],
        [TransactionStatus.PROCESSING, TransactionStatus.CANCELLED],
        [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED],
      ])(
        'allows %s → %s',
        (from: TransactionStatus, to: TransactionStatus) => {
          expect(() => service.assertLegalTransition(from, to)).not.toThrow();
        },
      );
    });

    describe('illegal transitions throw BadRequestException', () => {
      it.each([
        // Cannot skip states
        [TransactionStatus.PENDING, TransactionStatus.COMPLETED],
        [TransactionStatus.PENDING, TransactionStatus.REFUNDED],
        // Terminal state: COMPLETED can only go to REFUNDED
        [TransactionStatus.COMPLETED, TransactionStatus.FAILED],
        [TransactionStatus.COMPLETED, TransactionStatus.CANCELLED],
        // Terminal states cannot transition anywhere
        [TransactionStatus.FAILED, TransactionStatus.PENDING],
        [TransactionStatus.FAILED, TransactionStatus.PROCESSING],
        [TransactionStatus.CANCELLED, TransactionStatus.PENDING],
        [TransactionStatus.CANCELLED, TransactionStatus.PROCESSING],
        // REFUNDED is terminal
        [TransactionStatus.REFUNDED, TransactionStatus.COMPLETED],
        [TransactionStatus.REFUNDED, TransactionStatus.PENDING],
      ])(
        'rejects %s → %s',
        (from: TransactionStatus, to: TransactionStatus) => {
          expect(() => service.assertLegalTransition(from, to)).toThrow(
            BadRequestException,
          );
        },
      );

      it('error message includes both statuses', () => {
        expect(() =>
          service.assertLegalTransition(
            TransactionStatus.COMPLETED,
            TransactionStatus.FAILED,
          ),
        ).toThrow(/COMPLETED.*FAILED/);
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

      it('error message mentions "terminal state" for terminal-state rejections', () => {
        expect(() =>
          service.assertLegalTransition(
            TransactionStatus.FAILED,
            TransactionStatus.PENDING,
          ),
        ).toThrow(/terminal/i);
      });
    });
  });

  // ── Issue #246: Cursor-based pagination ────────────────────────────────────

  describe('getTransactions — cursor pagination (Issue #246)', () => {
    it('returns first page with no cursor', async () => {
      const result = await service.getTransactions({ limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.limit).toBe(10);
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 11 }), // limit + 1
      );
    });

    it('detects next page and sets nextCursor when extra row returned', async () => {
      // Return limit+1 rows to simulate that a next page exists
      const extraDonations = Array.from({ length: 11 }, (_, i) =>
        makeDonation({ id: `txn-${i + 1}` }),
      );
      prisma.donation.findMany.mockResolvedValue(extraDonations);

      const result = await service.getTransactions({ limit: 10 });

      expect(result.hasNextPage).toBe(true);
      expect(result.data).toHaveLength(10); // sliced to limit
      expect(result.nextCursor).toBe('txn-10'); // last item of the returned page
    });

    it('passes cursor and skip:1 to Prisma when cursor is provided', async () => {
      await service.getTransactions({ limit: 5, cursor: 'some-id' });

      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'some-id' },
          skip: 1,
          take: 6, // limit + 1
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
      );
    });

    it('does not pass cursor args to Prisma when cursor is undefined', async () => {
      await service.getTransactions({ limit: 5 });
  it('calculates correct skip for page 2', async () => {
    await service.getTransactions({ page: 2, limit: 5 });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
  });

      const callArg = prisma.donation.findMany.mock.calls[0][0];
      expect(callArg.cursor).toBeUndefined();
      expect(callArg.skip).toBeUndefined();
    });

    it('maps amount to number and sets type from assetCode', async () => {
      const result = await service.getTransactions({ limit: 10 });
      expect(result.data[0].amount).toBe(50);
      expect(result.data[0].type).toBe('XLM');
    });

    it('applies status filter', async () => {
      await service.getTransactions({ limit: 10, status: 'PENDING' });
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('applies date range filter', async () => {
      await service.getTransactions({
        limit: 10,
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });
      const callArg = prisma.donation.findMany.mock.calls[0][0];
      expect(callArg.where.donatedAt.gte).toEqual(new Date('2026-01-01'));
      expect(callArg.where.donatedAt.lte).toEqual(new Date('2026-01-31'));
    });

    it('applies type filter via assetCode', async () => {
      await service.getTransactions({ limit: 10, type: 'USDC' });
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assetCode: { equals: 'USDC', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('returns empty data array when no transactions', async () => {
      // @ts-ignore
      service = new TransactionsService(buildPrisma([]));
      const result = await service.getTransactions({ limit: 10 });
      expect(result.data).toHaveLength(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('orders by donatedAt desc', async () => {
      await service.getTransactions({ limit: 10 });
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { donatedAt: 'desc' } }),
      );
    });
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
