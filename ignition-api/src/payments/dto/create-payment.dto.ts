import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDecimalAmount,
  MINIMUM_PAYMENT_AMOUNT,
} from '../../common/decorators/is-decimal-amount.decorator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID of the sender wallet (must belong to the authenticated user)' })
  @IsUUID()
  @IsNotEmpty()
  senderWalletId: string;

  @ApiProperty({ description: 'Recipient Stellar address' })
  @IsString()
  @IsNotEmpty()
  recipientAddress: string;

  @ApiProperty({
    description:
      `Payment amount as a decimal string. ` +
      `Must be >= ${MINIMUM_PAYMENT_AMOUNT} (one stroop), ` +
      `at most 7 decimal places, and at most 20 total significant digits.`,
    example: '10.5000000',
  })
  @IsDecimalAmount()
  amount: string;

  @ApiProperty({ description: 'Asset code (e.g. XLM, USDC)' })
  @IsString()
  @IsNotEmpty()
  assetCode: string;
}
