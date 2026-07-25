import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeyScopeGuard } from '../api-keys/api-key-scope.guard';

// Override guards so the controller is testable without a real PrismaService.
const allowAllGuard = { canActivate: (_ctx: ExecutionContext) => true };

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<Pick<PaymentsService, 'initiatePayment'>>;

  beforeEach(async () => {
    service = {
      initiatePayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: service },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue(allowAllGuard)
      .overrideGuard(ApiKeyScopeGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() should call paymentsService.initiatePayment and return the result', async () => {
    const dto = {
      recipientAddress: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF',
      amount: '100.5000000',
      assetCode: 'XLM',
    };
    const expected = {
      id: 'payment-123',
      status: 'queued',
      recipientAddress: dto.recipientAddress,
      amount: dto.amount,
      assetCode: dto.assetCode,
      feeAmount: '0.0000200',
      feeAssetCode: 'XLM',
      createdAt: '2026-07-24T00:00:00.000Z',
    };
    service.initiatePayment.mockResolvedValue(expected as any);

    const res = await controller.create(dto);

    expect(service.initiatePayment).toHaveBeenCalledWith(dto);
    expect(res).toEqual(expected);
  });
});
