import { UnauthorizedException } from '@nestjs/common';
import { AuthLogoutController } from './auth-logout.controller';
import { SessionService } from '../session/session.service';
import { AuthTokenService } from './auth-token.service';

describe('AuthLogoutController', () => {
  let controller: AuthLogoutController;
  let sessionService: { revokeSession: jest.Mock };
  let tokenService: { revokeRefreshToken: jest.Mock };

  beforeEach(() => {
    sessionService = { revokeSession: jest.fn().mockResolvedValue(undefined) };
    tokenService = {
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    controller = new AuthLogoutController(
      sessionService as unknown as SessionService,
      tokenService as unknown as AuthTokenService,
    );
  });

  it('revokes the session and invalidates the refresh token on logout', async () => {
    const req = {
      user: {
        userId: 'user-123',
        sessionId: 'sess-abc',
        walletAddress: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF',
      },
    };

    const result = await controller.logout(req as any);

    // Session is revoked so the access token can no longer be used.
    expect(sessionService.revokeSession).toHaveBeenCalledWith(
      'user-123',
      'sess-abc',
    );

    // Refresh token cache entry is deleted so a stolen refresh token
    // cannot be exchanged for a new access token after logout.
    expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(
      'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5KABCDEF',
    );

    expect(result).toEqual({ message: 'Logged out successfully' });
  });

  it('still revokes the session when walletAddress is missing', async () => {
    const req = {
      user: { userId: 'user-123', sessionId: 'sess-abc', walletAddress: null },
    };

    await controller.logout(req as any);

    expect(sessionService.revokeSession).toHaveBeenCalledWith(
      'user-123',
      'sess-abc',
    );
    expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(null);
  });

  it('throws UnauthorizedException when req.user is missing', async () => {
    await expect(controller.logout({ user: undefined } as any)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(sessionService.revokeSession).not.toHaveBeenCalled();
    expect(tokenService.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('revokes session before invalidating the refresh token (ordering matters)', async () => {
    const callOrder: string[] = [];
    sessionService.revokeSession.mockImplementation(async () => {
      callOrder.push('session');
    });
    tokenService.revokeRefreshToken.mockImplementation(async () => {
      callOrder.push('refresh');
    });

    const req = {
      user: {
        userId: 'u',
        sessionId: 's',
        walletAddress: 'GABC',
      },
    };

    await controller.logout(req as any);

    expect(callOrder).toEqual(['session', 'refresh']);
  });
});
