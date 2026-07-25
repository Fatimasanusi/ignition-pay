import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BalanceReconciliationService } from './balance-reconciliation.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { BalanceDiscrepancy } from './entities/balance-discrepancy.entity';

describe('BalanceReconciliationService', () => {
  let service: BalanceReconciliationService;
  let walletRepoMock: any;
  let discrepancyRepoMock: any;

  beforeEach(async () => {
    walletRepoMock = {
      find: jest.fn(),
    };
    discrepancyRepoMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceReconciliationService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepoMock,
        },
        {
          provide: getRepositoryToken(BalanceDiscrepancy),
          useValue: discrepancyRepoMock,
        },
      ],
    }).compile();

    service = module.get<BalanceReconciliationService>(
      BalanceReconciliationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should flag balance discrepancy when DB and Horizon balance drift', async () => {
    const mockWallet = {
      id: 'wallet-123',
      stellarAddress: 'GABCD1234567890',
      balance: '100.0000000',
      isActive: true,
    } as Wallet;

    jest.spyOn(service['horizonServer'], 'loadAccount').mockResolvedValue({
      balances: [{ asset_type: 'native', balance: '95.0000000' }],
    } as any);

    const isDiscrepant = await service.reconcileWallet(mockWallet);

    expect(isDiscrepant).toBe(true);
    expect(discrepancyRepoMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet-123',
        dbBalance: '100.0000000',
        onChainBalance: '95.0000000',
        driftAmount: '5.0000000',
      }),
    );
  });
});