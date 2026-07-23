import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import { AuthChallengeService } from './auth-challenge.service';

jest.mock('keyv', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

interface MockKeyv {
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
}

describe('AuthChallengeService', () => {
  let service: AuthChallengeService;
  let cache: MockKeyv;
  let config: ConfigService;

  const walletAddress = 'GABC1234567890ABCDEF1234567890ABCDEF12345';

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    // Issue #231 — STELLAR_HOME_DOMAIN now scopes the issued challenge.
    config = new ConfigService({
      AUTH_CHALLENGE_TTL_MS: '300000',
      STELLAR_HOME_DOMAIN: 'ignition-pay.local',
    });

    service = new AuthChallengeService(cache as unknown as Keyv, config);
  });

  it('stores a newly issued challenge and consumes it once (#231)', async () => {
    cache.set.mockResolvedValue('OK');
    cache.get.mockResolvedValue('stored-challenge');
    cache.delete.mockResolvedValue(true);

    const challenge = await service.issueChallenge(walletAddress);
    cache.get.mockResolvedValue(challenge);

    // Issue #231 — the issue-side prefix MUST be the configured home
    // domain, not the old hardcoded `stellaraid:` literal.
    expect(challenge).toMatch(/^ignition-pay\.local:login:[0-9a-f]+:[0-9]+$/);
    expect(cache.set).toHaveBeenCalledWith(
      `auth:challenge:${walletAddress}`,
      challenge,
      300000,
    );

    await service.consumeChallenge(walletAddress, challenge);

    expect(cache.delete).toHaveBeenCalledWith(
      `auth:challenge:${walletAddress}`,
    );
  });

  it('rejects a replayed or expired challenge', async () => {
    cache.get.mockResolvedValue(undefined);

    await expect(
      service.consumeChallenge(walletAddress, 'expired-challenge'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('trims whitespace around STELLAR_HOME_DOMAIN (#231)', async () => {
    const trimmedConfig = new ConfigService({
      AUTH_CHALLENGE_TTL_MS: '300000',
      STELLAR_HOME_DOMAIN: '  staging.ignition-pay.org  ',
    });
    const trimmedService = new AuthChallengeService(
      cache as unknown as Keyv,
      trimmedConfig,
    );

    const challenge = await trimmedService.issueChallenge(walletAddress);

    expect(challenge.startsWith('staging.ignition-pay.org:login:')).toBe(true);
    expect(challenge).not.toContain('  ');
  });

  it('falls back to ignition-pay.local when STELLAR_HOME_DOMAIN is unset (#231)', async () => {
    const fallbackConfig = new ConfigService({
      AUTH_CHALLENGE_TTL_MS: '300000',
    });
    const fallbackService = new AuthChallengeService(
      cache as unknown as Keyv,
      fallbackConfig,
    );

    const challenge = await fallbackService.issueChallenge(walletAddress);

    expect(challenge.startsWith('ignition-pay.local:login:')).toBe(true);
  });
});
