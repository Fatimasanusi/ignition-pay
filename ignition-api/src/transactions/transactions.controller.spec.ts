import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PermissionsService } from '../auth/permissions/permissions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: jest.Mocked<Pick<TransactionsService, 'getTransactions'>>;

  beforeEach(async () => {
    service = {
      getTransactions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: TransactionsService, useValue: service },
        {
          provide: PermissionsService,
          useValue: { getUserPermissions: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getTransactions() should call transactionsService.getTransactions', async () => {
    const query = { page: 1, limit: 10 };
    service.getTransactions.mockResolvedValue({ data: [], meta: {} } as any);

    const res = await controller.getTransactions(query);

    expect(service.getTransactions).toHaveBeenCalledWith(query);
    expect(res).toEqual({ data: [], meta: {} });
  });
});
