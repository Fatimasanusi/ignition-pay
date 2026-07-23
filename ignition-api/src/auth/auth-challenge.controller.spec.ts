import { Test, TestingModule } from '@nestjs/testing';
import { AuthChallengeController } from './auth-challenge.controller';
import { AuthChallengeService } from './auth-challenge.service';

describe('AuthChallengeController', () => {
  let controller: AuthChallengeController;
  let service: jest.Mocked<Pick<AuthChallengeService, 'issueChallenge'>>;

  beforeEach(async () => {
    service = {
      issueChallenge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthChallengeController],
      providers: [{ provide: AuthChallengeService, useValue: service }],
    }).compile();

    controller = module.get<AuthChallengeController>(AuthChallengeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getChallenge() should return a challenge from the service', async () => {
    const query = { walletAddress: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF' };
    service.issueChallenge.mockResolvedValue(
      'stellaraid:login:challenge-nonce',
    );

    const res = await controller.getChallenge(query);

    expect(service.issueChallenge).toHaveBeenCalledWith(query.walletAddress);
    expect(res).toEqual({ challenge: 'stellaraid:login:challenge-nonce' });
  });
});
