import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            initiatePayment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    const walletId = 'wallet-uuid';
    const dto = {
      recipientAddress: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF',
      amount: '100.5000000',
      assetCode: 'XLM',
    };

    it('should call paymentsService.initiatePayment and return the result', async () => {
      const expected = {
        id: 'payment-123',
        status: 'queued',
        recipientAddress: dto.recipientAddress,
        amount: dto.amount,
        assetCode: dto.assetCode,
        createdAt: '2026-07-24T00:00:00.000Z',
      };
      service.initiatePayment.mockResolvedValue(expected as any);

      const res = await controller.create(walletId, dto);

      expect(service.initiatePayment).toHaveBeenCalledWith(walletId, dto);
      expect(res).toEqual(expected);
    });

    it('should propagate ForbiddenException when wallet is SUSPENDED', async () => {
      service.initiatePayment.mockRejectedValue(
        new ForbiddenException(
          'Outgoing transactions are not allowed: wallet is suspended',
        ),
      );
      await expect(controller.create(walletId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should propagate NotFoundException when wallet does not exist', async () => {
      service.initiatePayment.mockRejectedValue(
        new NotFoundException('Sender wallet not found'),
      );
      await expect(controller.create(walletId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
