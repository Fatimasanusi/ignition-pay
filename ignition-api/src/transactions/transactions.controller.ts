import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeyScopeGuard } from '../api-keys/api-key-scope.guard';
import { RequireScope } from '../api-keys/decorators/require-scope.decorator';
import { TransactionsService } from './transactions.service';
import { GetTransactionsQueryDto } from './dto/get-transactions.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * GET /transactions
   * List transactions with pagination and optional filters:
   * page, limit, dateFrom, dateTo, status, type
   */
  @Get()
  @UseGuards(ApiKeyGuard, ApiKeyScopeGuard)
  @RequireScope('read')
  @ApiOperation({ summary: 'Get paginated transactions with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated transaction list' })
  getTransactions(@Query() query: GetTransactionsQueryDto) {
    return this.transactionsService.getTransactions(query);
  }
}
