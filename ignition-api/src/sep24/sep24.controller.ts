import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard'
import { Sep24Service } from './sep24.service'
import {
  InitiateSep24Dto,
  Sep24StatusDto,
} from './dto/initiate-sep24.dto'
import {
  InitiateSep24ResponseDto,
  Sep24TransactionStatusResponseDto,
} from './dto/sep24-response.dto'
import { Throttle } from '@nestjs/throttler'

@ApiTags('sep24')
@ApiBearerAuth()
@Controller('sep24')
@UseGuards(JwtAuthGuard)
export class Sep24Controller {
  constructor(private readonly sep24Service: Sep24Service) {}

  @Post('initiate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Initiate a SEP-24 interactive deposit or withdrawal',
  })
  @ApiResponse({
    status: 201,
    description: 'Interactive flow initiated',
    type: InitiateSep24ResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or anchor error' })
  @ApiResponse({ status: 404, description: 'Anchor not found' })
  async initiate(
    @Body() dto: InitiateSep24Dto,
    @Request() req: any,
  ): Promise<InitiateSep24ResponseDto> {
    return this.sep24Service.initiate(dto, req.user.sub)
  }

  @Post('status')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Get SEP-24 transaction status' })
  @ApiResponse({
    status: 200,
    description: 'Transaction status',
    type: Sep24TransactionStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getStatus(
    @Body() dto: Sep24StatusDto,
  ): Promise<Sep24TransactionStatusResponseDto> {
    return this.sep24Service.getStatus(dto.id)
  }

  @Get('transactions/:id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Get SEP-24 transaction status by internal ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction status',
    type: Sep24TransactionStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(
    @Param('id') id: string,
  ): Promise<Sep24TransactionStatusResponseDto> {
    return this.sep24Service.getStatus(id)
  }
}
