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

export class GetTransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

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
}

export class TransactionDto {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  assetCode: string;
  stellarTxHash: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetTransactionsResponseDto {
  data: TransactionDto[];
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
