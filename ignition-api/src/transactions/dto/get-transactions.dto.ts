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
 * Uses cursor-based pagination instead of offset pagination.
 * `cursor` is the `id` of the last item from the previous page.
 * When omitted, the first page is returned.
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
  @IsIn(['PENDING', 'CONFIRMED', 'REFUNDED', 'FAILED'])
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class TransactionDto {
  id: string;
  amount: number;
  assetCode: string;
  txHash: string | null;
  status: string;
  type: string;
  donorId: string;
  campaignId: string;
  donatedAt: Date;
  confirmedAt: Date | null;
  createdAt: Date;
}

export class GetTransactionsResponseDto {
  data: TransactionDto[];
  /** Cursor to pass as `cursor` on the next request. Null when no more pages. */
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}
