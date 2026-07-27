import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class InitiateSep24ResponseDto {
  @ApiProperty({ description: 'Our internal SEP-24 transaction ID' })
  id: string

  @ApiProperty({ description: 'The anchor transaction ID' })
  anchorTxId: string

  @ApiProperty({ description: 'Interactive URL to load in iframe/popup' })
  interactiveUrl: string

  @ApiProperty({ description: 'Current status of the transaction' })
  status: string

  @ApiPropertyOptional({ description: 'Human-readable status description' })
  statusDesc?: string

  @ApiPropertyOptional({ description: 'More info URL for additional details' })
  moreInfoUrl?: string

  @ApiProperty({ description: 'When the transaction was initiated' })
  startedAt: Date
}

export class Sep24TransactionStatusResponseDto {
  @ApiProperty({ description: 'Our internal SEP-24 transaction ID' })
  id: string

  @ApiProperty({ description: 'The anchor transaction ID' })
  anchorTxId: string

  @ApiProperty({ description: 'Current status from SEP-24 spec' })
  status: string

  @ApiPropertyOptional({ description: 'Human-readable status description' })
  statusDesc?: string

  @ApiPropertyOptional({ description: 'More info URL for additional details' })
  moreInfoUrl?: string

  @ApiPropertyOptional({ description: 'Stellar transaction hash when completed' })
  stellarTxHash?: string

  @ApiPropertyOptional({ description: 'External transaction ID' })
  externalTxId?: string

  @ApiPropertyOptional({ description: 'Optional message from the anchor' })
  message?: string

  @ApiProperty({ description: 'Amount transferred' })
  amountIn?: string

  @ApiProperty({ description: 'Amount received in stellar asset' })
  amountOut?: string

  @ApiPropertyOptional({ description: 'Fee charged by the anchor' })
  feeDetails?: Record<string, unknown>

  @ApiProperty({ description: 'When the transaction was initiated' })
  startedAt: Date

  @ApiPropertyOptional({ description: 'When the transaction was completed' })
  completedAt?: Date
}
