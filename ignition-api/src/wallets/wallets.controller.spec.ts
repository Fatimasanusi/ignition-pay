import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { PermissionsService } from '../auth/permissions/permissions.service';

describe('WalletsController', () => {
  let controller: WalletsController;
  let service: jest.Mocked<
    Pick<WalletsService, 'createWallet' | 'getBalanceAndRecentTransactions'>
  >;

  beforeEach(async () => {
    service = {
      createWallet: jest.fn(),
      getBalanceAndRecentTransactions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        { provide: WalletsService, useValue: service },
        {
          provide: PermissionsService,
          useValue: { getUserPermissions: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createWallet', () => {
    it('should call walletsService.createWallet', async () => {
      const req = { user: { sub: 'user-123' } };
      const dto = {
        network: 'STELLAR' as any,
        depositAddress: 'G123',
        label: 'My Wallet',
        dailyLimit: 1000,
        monthlyLimit: 10000,
      };
      service.createWallet.mockResolvedValue({
        id: 'wallet-123',
        ...dto,
      } as any);

      const res = await controller.createWallet(req, dto);

      expect(service.createWallet).toHaveBeenCalledWith('user-123', dto);
      expect(res).toEqual({ id: 'wallet-123', ...dto });
    });
  });

  describe('getBalance', () => {
    it('should call walletsService.getBalanceAndRecentTransactions', async () => {
      service.getBalanceAndRecentTransactions.mockResolvedValue({
        balance: '100',
        transactions: [],
      } as any);

      const res = await controller.getBalance('wallet-123');

      expect(service.getBalanceAndRecentTransactions).toHaveBeenCalledWith(
        'wallet-123',
      );
      expect(res).toEqual({ balance: '100', transactions: [] });
    });

    it('should throw BadRequestException if id is missing', async () => {
      await expect(controller.getBalance('')).rejects.toThrow(
        new BadRequestException('Missing wallet id'),
      );
    });
  });
});
