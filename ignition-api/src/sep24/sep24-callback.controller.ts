import { Controller, Post, Param, Body, NotFoundException, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Sep24Service } from './sep24.service'

/**
 * Issue #427 — Public, unauthenticated webhook endpoint for SEP-24 anchors.
 *
 * Anchors cannot present a JWT, so this lives in its own controller without
 * the JwtAuthGuard used by the rest of the SEP-24 surface. The opaque
 * callback token embedded in the URL path authenticates the request.
 */
@ApiTags('sep24')
@Controller('sep24')
export class Sep24CallbackController {
  constructor(private readonly sep24Service: Sep24Service) {}

  @Post('callback/:token')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({
    summary: 'SEP-24 async status callback (invoked by the anchor, not the client)',
  })
  @ApiResponse({ status: 200, description: 'Callback accepted and status updated' })
  @ApiResponse({ status: 404, description: 'Unknown callback token' })
  @ApiResponse({ status: 400, description: 'Invalid callback payload' })
  async callback(
    @Param('token') token: string,
    @Body() payload: Record<string, any>,
  ): Promise<{ ok: true }> {
    await this.sep24Service.handleCallback(token, payload)
    return { ok: true }
  }
}
