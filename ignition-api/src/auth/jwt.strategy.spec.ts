import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthTokenService } from './auth-token.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let tokenService: { isAccessTokenBlacklisted: jest.Mock };

  beforeEach(async () => {
    tokenService = { isAccessTokenBlacklisted: jest.fn().mockResolvedValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: AuthTokenService,
          useValue: tokenService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should throw UnauthorizedException if sub is missing', async () => {
      await expect(strategy.validate({} as any)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });

    it('should return validated user object if sub is present', async () => {
      const payload = {
        sub: 'user-123',
        walletAddress: 'G123',
        email: 'user@example.com',
        role: 'USER',
        sid: 'sess-123',
      };

      const result = await strategy.validate(payload);

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

    it('should throw UnauthorizedException when session is blacklisted', async () => {
      tokenService.isAccessTokenBlacklisted.mockResolvedValue(true);

      await expect(
        strategy.validate({
          sub: 'user-123',
          walletAddress: 'G123',
          role: 'USER',
          sid: 'sess-revoked',
        }),
      ).rejects.toThrow(new UnauthorizedException('Session has been revoked'));

      expect(tokenService.isAccessTokenBlacklisted).toHaveBeenCalledWith(
        'sess-revoked',
      );
    });

    it('should not check blacklist when sid is absent', async () => {
      const result = await strategy.validate({
        sub: 'user-123',
        walletAddress: 'G123',
        role: 'USER',
      });

      expect(result).toEqual(
        expect.objectContaining({ sub: 'user-123' }),
      );
      expect(tokenService.isAccessTokenBlacklisted).not.toHaveBeenCalled();
    });
  });
});
