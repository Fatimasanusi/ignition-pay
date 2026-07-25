import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnprocessableEntityException } from '@nestjs/common';
import { WalletLimitService } from './wallet-limit.service';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

describe('WalletLimitService', () => {
  let service: WalletLimitService;
  let txQueryBuilderMock: any;

  beforeEach(async () => {
    txQueryBuilderMock = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    const txRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(txQueryBuilderMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletLimitService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: txRepoMock,
        },
      ],
    }).compile();

    service = module.get<WalletLimitService>(WalletLimitService);
  });

  it('should pass validation when outgoing transfer is within daily limit', async () => {
    const mockWallet = {
      id: 'wallet-1',
      dailyLimit: '1000.0000000',
      monthlyLimit: '5000.0000000',
    } as Wallet;

    txQueryBuilderMock.getRawOne.mockResolvedValue({ totalSpent: '400.0000000' });

    await expect(
      service.validateTransactionLimits(mockWallet, '500.0000000'),
    ).resolves.not.toThrow();
  });

  it('should throw UnprocessableEntityException when transfer exceeds rolling 24-hour limit', async () => {
    const mockWallet = {
      id: 'wallet-1',
      dailyLimit: '1000.0000000',
      monthlyLimit: null,
    } as Wallet;

    txQueryBuilderMock.getRawOne.mockResolvedValue({ totalSpent: '800.0000000' });

    await expect(
      service.validateTransactionLimits(mockWallet, '300.0000000'),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});