import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DisputesService } from './disputes.service';
import { Dispute, DisputeStatus } from './entities/dispute.entity';
import { Donation, DonationStatus } from '../donations/entities/donation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DisputeResolutionOutcome } from './dto/resolve-dispute.dto';

describe('DisputesService', () => {
  let service: DisputesService;
  let queryRunnerMock: any;
  let notificationsServiceMock: any;

  beforeEach(async () => {
    queryRunnerMock = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn().mockImplementation((entity, obj) => Promise.resolve(obj)),
      },
    };

    notificationsServiceMock = {
      send: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: getRepositoryToken(Dispute), useValue: {} },
        { provide: getRepositoryToken(Donation), useValue: {} },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        {
          provide: DataSource,
          useValue: { createQueryRunner: () => queryRunnerMock },
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  it('should resolve dispute as REFUNDED and update donation status within transaction', async () => {
    const mockDispute = {
      id: 'dispute-1',
      status: DisputeStatus.OPEN,
      donation: { id: 'don-1', status: DonationStatus.COMPLETED },
      donor: { id: 'user-donor' },
      recipient: { id: 'user-recipient' },
    };

    queryRunnerMock.manager.findOne.mockResolvedValue(mockDispute);

    const result = await service.resolveDispute('dispute-1', 'admin-1', {
      outcome: DisputeResolutionOutcome.REFUNDED,
      resolutionNotes: 'Approved refund request',
    });

    expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
    expect(result.status).toBe(DisputeStatus.RESOLVED_REFUNDED);
    expect(mockDispute.donation.status).toBe(DonationStatus.REFUNDED);
    expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
    expect(notificationsServiceMock.send).toHaveBeenCalledTimes(2);
  });
});