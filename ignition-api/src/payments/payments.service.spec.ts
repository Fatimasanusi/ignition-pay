import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

// ── Helper ────────────────────────────────────────────────────────────────────

const makeConfig = (horizonUrl = 'https://horizon.stellar.org') =>
  ({
    get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'HORIZON_URL') return horizonUrl;
      return fallback;
    }),
  }) as unknown as ConfigService;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsService — fee estimation (Issue #245)', () => {
  let service: PaymentsService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new PaymentsService(makeConfig());

    // Replace global fetch with a Jest mock for the duration of each test.
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── estimateFee ─────────────────────────────────────────────────────────────

  describe('estimateFee()', () => {
    it('converts p50 stroops to 7-decimal XLM string', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          last_ledger_base_fee: '100',
          fee_charged: { p50: '200', p90: '400', p95: '600', p99: '1000' },
        }),
      } as Response);

      const fee = await service.estimateFee();

      // 200 stroops / 10_000_000 = 0.00002 XLM → '0.0000200'
      expect(fee.feeAmount).toBe('0.0000200');
      expect(fee.feeAssetCode).toBe('XLM');
    });

    it('falls back to last_ledger_base_fee when fee_charged.p50 is missing', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          last_ledger_base_fee: '100',
          fee_charged: {},
        }),
      } as Response);

      const fee = await service.estimateFee();

      // 100 stroops = 0.00001 XLM → '0.0000100'
      expect(fee.feeAmount).toBe('0.0000100');
      expect(fee.feeAssetCode).toBe('XLM');
    });

    it('falls back to minimum fee when Horizon responds with a non-OK status', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);

      const fee = await service.estimateFee();

      expect(fee.feeAmount).toBe('0.0000100');
      expect(fee.feeAssetCode).toBe('XLM');
    });

    it('falls back to minimum fee when fetch throws a network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const fee = await service.estimateFee();

      expect(fee.feeAmount).toBe('0.0000100');
      expect(fee.feeAssetCode).toBe('XLM');
    });

    it('calls the correct Horizon URL', async () => {
      const customUrl = 'https://horizon-testnet.stellar.org';
      service = new PaymentsService(makeConfig(customUrl));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          last_ledger_base_fee: '100',
          fee_charged: { p50: '150' },
        }),
      } as Response);

      await service.estimateFee();

      expect(fetchMock).toHaveBeenCalledWith(`${customUrl}/fee_stats`);
    });
  });

  // ── initiatePayment ─────────────────────────────────────────────────────────

  describe('initiatePayment()', () => {
    const dto = {
      recipientAddress: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF12345',
      amount: '100.5000000',
      assetCode: 'XLM',
    };

    beforeEach(() => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          last_ledger_base_fee: '100',
          fee_charged: { p50: '200' },
        }),
      } as Response);
    });

    it('returns expected fields with feeAmount and feeAssetCode populated', async () => {
      const result = await service.initiatePayment(dto);

      expect(result.status).toBe('queued');
      expect(result.recipientAddress).toBe(dto.recipientAddress);
      expect(result.amount).toBe(dto.amount);
      expect(result.assetCode).toBe(dto.assetCode);
      expect(result.feeAmount).toBe('0.0000200');
      expect(result.feeAssetCode).toBe('XLM');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('feeAmount is never zero — falls back to minimum when Horizon is down', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Horizon down'));

      const result = await service.initiatePayment(dto);

      expect(result.feeAmount).toBe('0.0000100');
      expect(parseFloat(result.feeAmount)).toBeGreaterThan(0);
    });

    it('returns a unique id on each call', async () => {
      const r1 = await service.initiatePayment(dto);
      const r2 = await service.initiatePayment(dto);
      expect(r1.id).not.toBe(r2.id);
    });
  });
});
