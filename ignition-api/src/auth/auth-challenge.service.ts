import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import Keyv from 'keyv';
import { buildChallengePrefix, resolveHomeDomain } from './auth-home-domain';

/**
 * Issue #231 — SEP-10 challenge issuance.
 *
 * The issued challenge format is:
 *     `<STELLAR_HOME_DOMAIN>:login:<nonce>:<unix_ts>`
 *
 * The home-domain prefix replaces the previously hardcoded `stellaraid:`
 * literal so staging and prod sign challenges under different identifiers,
 * preventing accidental cross-environment replay. Validation guarantees
 * (no `:` in the home domain, non-empty) live in ConfigValidationService.
 *
 * AuthVerifyController additionally re-checks the prefix at verify time so
 * any token claiming a non-local home domain is rejected before the
 * (expensive) Ed25519 signature verification runs.
 */
@Injectable()
export class AuthChallengeService {
  private readonly defaultTtlMs = 5 * 60 * 1000;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Keyv,
    private readonly config: ConfigService,
  ) {}

  /**
   * Build the configured home-domain identifier used to scope the
   * challenge. Delegates to the shared `auth-home-domain` resolver so
   * the challenge-issuer and the challenge-verifier stay in lock-step.
   */
  private getHomeDomain(): string {
    return resolveHomeDomain(this.config);
  }

  async issueChallenge(walletAddress: string): Promise<string> {
    const nonce = randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    // Issue #231: prefix the challenge with the configured home domain
    // instead of the hardcoded `stellaraid:` literal.
    const challenge = `${buildChallengePrefix(this.getHomeDomain())}${nonce}:${timestamp}`;
    const ttlMs = this.getTtlMs();

    await this.cache.set(this.getCacheKey(walletAddress), challenge, ttlMs);

    return challenge;
  }

  async consumeChallenge(
    walletAddress: string,
    challenge: string,
  ): Promise<void> {
    const storedChallenge = await this.cache.get(
      this.getCacheKey(walletAddress),
    );

    if (!storedChallenge || storedChallenge !== challenge) {
      throw new UnauthorizedException('Challenge expired or already used');
    }

    await this.cache.delete(this.getCacheKey(walletAddress));
  }

  private getCacheKey(walletAddress: string): string {
    return `auth:challenge:${walletAddress}`;
  }

  private getTtlMs(): number {
    const configuredTtl = this.config.get<string>('AUTH_CHALLENGE_TTL_MS');
    const parsedTtl = Number(configuredTtl ?? this.defaultTtlMs);

    return Number.isFinite(parsedTtl) && parsedTtl > 0
      ? parsedTtl
      : this.defaultTtlMs;
  }
}
