import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletLimitService } from '../wallets/services/wallet-limit.service';
import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly walletLimitService: WalletLimitService,
    private readonly dataSource: DataSource,
  ) {}

  async processPayment(senderWalletId: string, dto: CreatePaymentDto) {
    const senderWallet = await this.walletRepository.findOne({
      where: { id: senderWalletId },
    });

    if (!senderWallet) {
      throw new BadRequestException('Sender wallet not found');
    }

    // Enforce rolling daily and monthly transfer limits prior to transaction creation
    await this.walletLimitService.validateTransactionLimits(
      senderWallet,
      dto.amount,
    );

    // Proceed with payment execution...
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