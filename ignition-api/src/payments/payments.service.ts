import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  async initiatePayment(dto: CreatePaymentDto) {
    // amount validity (range, precision) is enforced by @IsDecimalAmount on
    // CreatePaymentDto — no redundant guard needed here.
    return {
      id: crypto.randomUUID(),
      status: 'queued',
      recipientAddress: dto.recipientAddress,
      amount: dto.amount,
      assetCode: dto.assetCode,
      createdAt: new Date().toISOString(),
    };
  }
}
