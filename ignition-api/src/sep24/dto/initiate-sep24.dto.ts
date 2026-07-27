import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum Sep24Operation {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

export class InitiateSep24Dto {
  @ApiProperty({ description: 'Anchor name (e.g. "StellarX", "AnchorUSD")' })
  @IsString()
  anchorName: string

  @ApiProperty({ enum: Sep24Operation })
  @IsEnum(Sep24Operation)
  operation: Sep24Operation

  @ApiProperty({ description: 'Asset code to deposit/withdraw' })
  @IsString()
  assetCode: string

  @ApiPropertyOptional({ description: 'Asset issuer (optional for native assets)' })
  @IsString()
  @IsOptional()
  assetIssuer?: string

  @ApiPropertyOptional({ description: 'Amount (optional, some anchors allow empty)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number

  @ApiProperty({ description: "User's Stellar account (G...)" })
  @IsString()
  stellarAccount: string
}

export class Sep24StatusDto {
  @ApiProperty({ description: 'Internal SEP-24 transaction ID' })
  @IsString()
  id: string
}
