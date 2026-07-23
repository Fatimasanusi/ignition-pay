import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should throw UnauthorizedException if sub is missing', () => {
      expect(() => strategy.validate({} as any)).toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });

    it('should return validated user object if sub is present', () => {
      const payload = {
        sub: 'user-123',
        walletAddress: 'G123',
        email: 'user@example.com',
        role: 'USER',
        sid: 'sess-123',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        sub: 'user-123',
        userId: 'user-123',
        walletAddress: 'G123',
        email: 'user@example.com',
        role: 'USER',
        sessionId: 'sess-123',
        sid: 'sess-123',
      });
    });
  });
});
