import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<Pick<PaymentsService, 'initiatePayment'>>;

  beforeEach(async () => {
    service = {
      initiatePayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() should call paymentsService.initiatePayment and return the result', async () => {
    const dto = {
      recipientAddress: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF',
      // amount is a decimal string — validated upstream by @IsDecimalAmount
      amount: '100.5000000',
      assetCode: 'XLM',
    };
    const expected = {
      id: 'payment-123',
      status: 'queued',
      recipientAddress: dto.recipientAddress,
      amount: dto.amount,
      assetCode: dto.assetCode,
      createdAt: '2026-07-24T00:00:00.000Z',
    };
    service.initiatePayment.mockResolvedValue(expected as any);

    const res = await controller.create(dto);

    expect(service.initiatePayment).toHaveBeenCalledWith(dto);
    expect(res).toEqual(expected);
  });
});
