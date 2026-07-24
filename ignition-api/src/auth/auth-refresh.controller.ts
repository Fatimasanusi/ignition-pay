import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseFilters,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthTokenService } from './auth-token.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginResponseDto } from '../users/dto/login.dto';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import { AuthErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('auth')
@Controller('auth')
@UseFilters(AuthExceptionFilter)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthRefreshController {
  constructor(private readonly tokenService: AuthTokenService) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({
    status: 400,
    description: 'refreshToken is required',
    type: AuthErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or revoked token',
    type: AuthErrorResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({
    status: 503,
    description: 'Service temporarily unavailable',
    type: AuthErrorResponseDto,
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponseDto> {
    return this.tokenService.validateAndRotate(dto.refreshToken);
  }
}
