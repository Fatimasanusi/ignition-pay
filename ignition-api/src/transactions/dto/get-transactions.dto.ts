import { Type } from 'class-transformer';
import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';

/**
 * Query DTO for GET /transactions (Issue #246).
 *
 * Uses cursor-based pagination — `cursor` is the `id` of the last item
 * returned on the previous page. Omit to fetch the first page.
 * Offset-based `page` / `skip` fields have been removed.
 */
export class GetTransactionsQueryDto {
  /**
   * Opaque cursor: the `id` of the last transaction returned on the
   * previous page. Omit (or pass empty) to fetch the first page.
   */
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'])
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Filter by asset code, e.g. "XLM", "USDC".
   * Case-insensitive exact match against the donation's assetCode.
   */
  @IsOptional()
  @IsString()
  asset?: string;

  /**
   * Free-text search over counterparty wallet address (donorId) and tx hash.
   * Partial, case-insensitive match.
   */
  @IsOptional()
  @IsString()
  search?: string;
}

export class TransactionDto {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  /** Amount as string to preserve Decimal(20,7) precision (Issue #409) */
  amount: string;
  assetCode: string;
  stellarTxHash: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetTransactionsResponseDto {
  data: TransactionDto[];
  /** Cursor to pass as `cursor` on the next request. Null when no more pages. */
  nextCursor: string | null;
  hasNextPage: boolean;
  total: number;
  page: number;
  limit: number;
}

export class SubmitTransactionDto {
  fromWalletId: string;
  toWalletId: string;
  amount: string;
  assetCode?: string;
  /** Idempotency key — provide the Stellar tx hash to dedupe retries (#244) */
  stellarTxHash?: string;
}
