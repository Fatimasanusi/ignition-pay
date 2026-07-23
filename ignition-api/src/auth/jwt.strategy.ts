import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly tokenService: AuthTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'stellaraid-default-secret',
      ),
    });
  }

  async validate(payload: {
    sub: string;
    walletAddress: string;
    email?: string;
    role?: string;
    sid?: string;
  }) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    if (
      payload.sid &&
      (await this.tokenService.isAccessTokenBlacklisted(payload.sid))
    ) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return {
      sub: payload.sub,
      userId: payload.sub,
      walletAddress: payload.walletAddress,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sid,
      sid: payload.sid,
    };
  }
}
