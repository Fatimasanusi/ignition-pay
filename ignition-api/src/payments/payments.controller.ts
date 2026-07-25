import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeyScopeGuard } from '../api-keys/api-key-scope.guard';
import { RequireScope } from '../api-keys/decorators/require-scope.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(ApiKeyGuard, ApiKeyScopeGuard)
  @RequireScope('write')
  @ApiOperation({ summary: 'Initiate a payment' })
  @ApiResponse({ status: 201, description: 'Payment queued' })
  @ApiResponse({ status: 400, description: 'Invalid payment details' })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.initiatePayment(dto);
  }
}
