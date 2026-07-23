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

  it('create() should call paymentsService.initiatePayment', async () => {
    const dto = {
      campaignId: 'camp-123',
      amount: '100',
      donorWalletAddress: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF',
    };
    service.initiatePayment.mockResolvedValue({
      id: 'payment-123',
      status: 'PENDING',
    } as any);

    const res = await controller.create(dto);

    expect(service.initiatePayment).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'payment-123', status: 'PENDING' });
  });
});
