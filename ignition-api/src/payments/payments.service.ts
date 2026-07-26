import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiatePayment(senderWalletId: string, dto: CreatePaymentDto) {
    // Fetch the sender wallet and verify it exists.
    const senderWallet = await this.prisma.wallet.findUnique({
      where: { id: senderWalletId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    // Issue #242: Reject outgoing transactions when the wallet is SUSPENDED.
    if (senderWallet.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Outgoing transactions are not allowed: wallet is suspended',
      );
    }

    if (senderWallet.status === 'CLOSED') {
      throw new ForbiddenException(
        'Outgoing transactions are not allowed: wallet is closed',
      );
    }

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
