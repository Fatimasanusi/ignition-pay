import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SessionGuard } from './session.guard';
import type { AuthenticatedRequest } from './session.guard';
import { SessionMetadata, SessionService } from './session.service';

class SessionInfoDto {
  sessionId: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  isCurrent: boolean;
}

/**
 * Session management endpoints (list / revoke / revoke-all).
 *
 * NOTE: /auth/refresh lives in `AuthRefreshController` (see Issue #110)
 * to keep refresh logic isolated from session bookkeeping and to avoid
 * route collisions. This controller only manages active sessions.
 */
@ApiTags('auth')
@Controller('auth')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * GET /auth/sessions
   * List all active sessions for the authenticated user.
   */
  @UseGuards(SessionGuard)
  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all active sessions for the current user' })
  @ApiResponse({ status: 200, description: 'Array of active session metadata' })
  async listSessions(
    @Req() req: AuthenticatedRequest,
  ): Promise<SessionInfoDto[]> {
    const sessions = await this.sessionService.getActiveSessions(
      req.user.userId,
    );
    return sessions.map((s) => this.toDto(s, req.user.sessionId));
  }

  /**
   * DELETE /auth/sessions/:sessionId
   * Revoke a specific session (e.g., logout another device).
   */
  @UseGuards(SessionGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiParam({ name: 'sessionId', description: 'The session ID to revoke' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeSession(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException('Invalid token');
    }
    // Users can only revoke their own sessions
    const session = await this.sessionService.getSession(sessionId);
    if (session && session.userId === req.user.userId) {
      await this.sessionService.revokeSession(req.user.userId, sessionId);
    }
  }

  /**
   * DELETE /auth/sessions
   * Revoke all sessions for the current user (sign out everywhere).
   */
  @UseGuards(SessionGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke all sessions (sign out everywhere)' })
  @ApiResponse({ status: 204, description: 'All sessions revoked' })
  async revokeAllSessions(@Req() req: AuthenticatedRequest): Promise<void> {
    await this.sessionService.revokeAllSessions(req.user.userId);
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private toDto(
    session: SessionMetadata,
    currentSessionId: string,
  ): SessionInfoDto {
    return {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isCurrent: session.sessionId === currentSessionId,
    };
  }
}
