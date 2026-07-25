import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const makeDto = (): CreatePaymentDto => ({
  senderWalletId: 'a1b2c3d4-0000-0000-0000-000000000001',
  recipientAddress: 'GRECIPIENT0000000000000000000000000000000000000000000000',
  amount: '100.5000000',
  assetCode: 'XLM',
});

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<Pick<PaymentsService, 'initiatePayment'>>;

  beforeEach(async () => {
    service = { initiatePayment: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('delegates to PaymentsService.initiatePayment and returns the result', async () => {
    const dto = makeDto();
    const expected = {
      id: 'txn-abc-123',
      status: 'queued',
      senderWalletId: dto.senderWalletId,
      recipientAddress: dto.recipientAddress,
      amount: dto.amount,
      assetCode: dto.assetCode,
      createdAt: '2026-07-25T10:00:00.000Z',
    };
    service.initiatePayment.mockResolvedValue(expected as any);

    const result = await controller.create(dto);

    expect(service.initiatePayment).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });
});
