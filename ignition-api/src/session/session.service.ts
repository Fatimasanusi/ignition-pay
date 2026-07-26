import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import { randomBytes } from 'crypto';

export interface SessionMetadata {
  sessionId: string;
  userId: string;
  walletAddress: string;
  role: string;
  createdAt: number; // Unix timestamp (ms)
  expiresAt: number; // Unix timestamp (ms)
  lastSeenAt: number;
  ipAddress?: string;
  userAgent?: string;
}

/** Prefix for individual session hash keys: session:{sessionId} */
const SESSION_KEY = (sessionId: string) => `session:${sessionId}`;

/** Prefix for the per-user session index (a JSON array of session IDs) */
const USER_SESSIONS_KEY = (userId: string) => `user_sessions:${userId}`;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  /** Access-token lifetime in seconds (default 15 min) */
  private readonly accessTtlSeconds: number;
  /** Refresh-token / session lifetime in seconds (default 7 days) */
  private readonly sessionTtlSeconds: number;
  /**
   * Issue #264 — Idle timeout in seconds.
   * A session is invalidated when the gap between NOW and `lastSeenAt`
   * exceeds this value, even if the absolute `expiresAt` has not been
   * reached.  Defaults to 30 minutes (1800 s).  Set to 0 to disable.
   */
  private readonly idleTimeoutSeconds: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Keyv,
    private readonly config: ConfigService,
  ) {
    this.accessTtlSeconds = this.config.get<number>(
      'SESSION_ACCESS_TTL_SECONDS',
      900,
    );
    this.sessionTtlSeconds = this.config.get<number>(
      'SESSION_TTL_SECONDS',
      604800,
    ); // 7d
    this.idleTimeoutSeconds = this.config.get<number>(
      'SESSION_IDLE_TIMEOUT_SECONDS',
      1800,
    ); // 30 min
  }

  /** Returns true when the session has exceeded the idle timeout window. */
  isIdleExpired(session: SessionMetadata): boolean {
    if (this.idleTimeoutSeconds <= 0) return false;
    const idleMs = this.idleTimeoutSeconds * 1000;
    return Date.now() - session.lastSeenAt > idleMs;
  }

  /** Generate a cryptographically random session ID */
  generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /** TTL in milliseconds used when writing to Keyv (Keyv uses ms) */
  private get sessionTtlMs(): number {
    return this.sessionTtlSeconds * 1000;
  }

  /**
   * Create and persist a new session.
   * Returns the session metadata (including the new sessionId).
   */
  async createSession(params: {
    userId: string;
    walletAddress: string;
    role: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SessionMetadata> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const expiresAt = now + this.sessionTtlMs;

    const session: SessionMetadata = {
      sessionId,
      userId: params.userId,
      walletAddress: params.walletAddress,
      role: params.role,
      createdAt: now,
      expiresAt,
      lastSeenAt: now,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };

    // Persist session data
    await this.cache.set(
      SESSION_KEY(sessionId),
      JSON.stringify(session),
      this.sessionTtlMs,
    );

    // Add to user's session index
    await this.addToUserIndex(params.userId, sessionId);

    this.logger.log(`Session created: ${sessionId} for user ${params.userId}`);
    return session;
  }

  /**
   * Look up a session by ID.
   * Returns null if not found, absolutely expired, or idle-timed-out.
   *
   * Issue #264 — Idle timeout:
   *   A session is invalidated and freed from Redis when the time since
   *   `lastSeenAt` exceeds `SESSION_IDLE_TIMEOUT_SECONDS`, even if the
   *   absolute `expiresAt` horizon has not yet been reached.  The Redis
   *   key is deleted immediately so the slot is freed without waiting for
   *   the TTL to drain naturally.
   */
  async getSession(sessionId: string): Promise<SessionMetadata | null> {
    const raw = await this.cache.get<string>(SESSION_KEY(sessionId));
    if (!raw) return null;

    try {
      const session: SessionMetadata = JSON.parse(raw);

      // Absolute expiry check
      if (Date.now() > session.expiresAt) {
        await this.revokeSession(session.userId, sessionId);
        return null;
      }

      // Issue #264 — Idle timeout check
      if (this.isIdleExpired(session)) {
        this.logger.log(
          `Session ${sessionId} idle-expired for user ${session.userId} ` +
            `(idle ${Math.round((Date.now() - session.lastSeenAt) / 1000)}s > ` +
            `limit ${this.idleTimeoutSeconds}s)`,
        );
        await this.revokeSession(session.userId, sessionId);
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Slide the session TTL and update lastSeenAt (called on each authenticated request).
   */
  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.lastSeenAt = Date.now();
    session.expiresAt = Date.now() + this.sessionTtlMs;

    await this.cache.set(
      SESSION_KEY(sessionId),
      JSON.stringify(session),
      this.sessionTtlMs,
    );
  }

  /**
   * Revoke (delete) a single session.
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.cache.delete(SESSION_KEY(sessionId));
    await this.removeFromUserIndex(userId, sessionId);
    this.logger.log(`Session revoked: ${sessionId} for user ${userId}`);
  }

  /**
   * Revoke all sessions for a user (e.g., on password reset).
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const sessionIds = await this.getUserSessionIds(userId);
    await Promise.all(
      sessionIds.map((id) => this.cache.delete(SESSION_KEY(id))),
    );
    await this.cache.delete(USER_SESSIONS_KEY(userId));
    this.logger.log(`All sessions revoked for user ${userId}`);
  }

  /**
   * Return all active session metadata objects for a user.
   * Stale (expired or missing) entries are pruned automatically.
   */
  async getActiveSessions(userId: string): Promise<SessionMetadata[]> {
    const sessionIds = await this.getUserSessionIds(userId);
    const sessions: SessionMetadata[] = [];
    const stale: string[] = [];

    for (const id of sessionIds) {
      const session = await this.getSession(id);
      if (session) {
        sessions.push(session);
      } else {
        stale.push(id);
      }
    }

    // Prune stale IDs from the index without awaiting
    if (stale.length > 0) {
      void this.pruneUserIndex(userId, stale);
    }

    return sessions;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getUserSessionIds(userId: string): Promise<string[]> {
    const raw = await this.cache.get<string>(USER_SESSIONS_KEY(userId));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  private async addToUserIndex(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const existing = await this.getUserSessionIds(userId);
    const updated = [...new Set([...existing, sessionId])];
    // Keep the index alive as long as the longest possible session
    await this.cache.set(
      USER_SESSIONS_KEY(userId),
      JSON.stringify(updated),
      this.sessionTtlMs,
    );
  }

  private async removeFromUserIndex(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const existing = await this.getUserSessionIds(userId);
    const updated = existing.filter((id) => id !== sessionId);
    if (updated.length === 0) {
      await this.cache.delete(USER_SESSIONS_KEY(userId));
    } else {
      await this.cache.set(
        USER_SESSIONS_KEY(userId),
        JSON.stringify(updated),
        this.sessionTtlMs,
      );
    }
  }

  private async pruneUserIndex(
    userId: string,
    staleIds: string[],
  ): Promise<void> {
    const existing = await this.getUserSessionIds(userId);
    const updated = existing.filter((id) => !staleIds.includes(id));
    if (updated.length === 0) {
      await this.cache.delete(USER_SESSIONS_KEY(userId));
    } else {
      await this.cache.set(
        USER_SESSIONS_KEY(userId),
        JSON.stringify(updated),
        this.sessionTtlMs,
      );
    }
  }
}
