import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeyScopeGuard } from '../api-keys/api-key-scope.guard';

// Override guards so the controller tests don't need a live PrismaService.
const allowAllGuard = { canActivate: (_ctx: ExecutionContext) => true };

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
    })
      .overrideGuard(ApiKeyGuard)
      .useValue(allowAllGuard)
      .overrideGuard(ApiKeyScopeGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getTransactions() should call transactionsService.getTransactions and return cursor-paginated result', async () => {
    const query = { limit: 10 };
    const mockResponse = {
      data: [],
      nextCursor: null,
      hasNextPage: false,
      limit: 10,
    };
    service.getTransactions.mockResolvedValue(mockResponse as any);

    const res = await controller.getTransactions(query);

    expect(service.getTransactions).toHaveBeenCalledWith(query);
    expect(res).toEqual(mockResponse);
  });

  it('getTransactions() passes cursor and filters to service', async () => {
    const query = {
      cursor: 'some-id',
      limit: 5,
      status: 'PENDING',
      type: 'XLM',
    };
    service.getTransactions.mockResolvedValue({
      data: [],
      nextCursor: null,
      hasNextPage: false,
      limit: 5,
    } as any);

    await controller.getTransactions(query);

    expect(service.getTransactions).toHaveBeenCalledWith(query);
  });
});
