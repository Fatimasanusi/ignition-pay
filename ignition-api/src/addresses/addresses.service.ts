import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';
import StellarSdk from '@stellar/stellar-sdk';
import { GenerateAddressDto } from './dto/generate-address.dto';
import { WalletNetwork } from '../wallets/dto/create-wallet.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAddressDto): Promise<AddressResponseDto> {
    const existing = await this.prisma.address.findUnique({
      where: { address: dto.address },
    });
    if (existing) {
      throw new ConflictException('Address already exists');
    }

    if (dto.walletId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: dto.walletId, isActive: true },
      });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
    }

    const address = await this.prisma.address.create({
      data: {
        address: dto.address,
        network: dto.network ?? 'STELLAR',
        walletId: dto.walletId ?? null,
        label: dto.label ?? null,
        isActive: dto.isActive ?? true,
        allocatedAt: dto.walletId ? new Date() : null,
      },
    });

    return this.toResponse(address);
  }

  async findAll(): Promise<AddressResponseDto[]> {
    const addresses = await this.prisma.address.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return addresses.map(this.toResponse);
  }

  async findOne(id: string): Promise<AddressResponseDto> {
    const address = await this.prisma.address.findUnique({
      where: { id, isActive: true },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return this.toResponse(address);
  }

  async findByAddress(addressStr: string): Promise<AddressResponseDto> {
    const address = await this.prisma.address.findUnique({
      where: { address: addressStr, isActive: true },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return this.toResponse(address);
  }

  async findByWallet(walletId: string): Promise<AddressResponseDto[]> {
    const addresses = await this.prisma.address.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
    });
    return addresses.map(this.toResponse);
  }

  async update(id: string, dto: UpdateAddressDto): Promise<AddressResponseDto> {
    const existing = await this.prisma.address.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (dto.walletId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: dto.walletId, isActive: true },
      });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
    }

    const wasUnallocated = !existing.walletId && !!dto.walletId;

    const address = await this.prisma.address.update({
      where: { id },
      data: {
        ...(dto.walletId !== undefined && { walletId: dto.walletId }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.network !== undefined && { network: dto.network }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(wasUnallocated && { allocatedAt: new Date() }),
      },
    });

    return this.toResponse(address);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.address.findUnique({
      where: { id, isActive: true },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({ where: { id } });
  }

  async touchActivity(id: string): Promise<void> {
    await this.prisma.address.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  }

  private toResponse(address: any): AddressResponseDto {
    return {
      id: address.id,
      walletId: address.walletId ?? undefined,
      address: address.address,
      network: address.network,
      label: address.label ?? undefined,
      isActive: address.isActive,
      allocatedAt: address.allocatedAt ?? undefined,
      lastActivityAt: address.lastActivityAt ?? undefined,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  async generate(userId: string, dto: GenerateAddressDto) {
    const { walletId, network = WalletNetwork.STELLAR, label } = dto;

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId, isActive: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.userId !== userId)
      throw new NotFoundException('Wallet not found');

    // Generate a unique Stellar keypair address
    let address: string;
    let attempts = 0;
    do {
      address = StellarSdk.Keypair.random().publicKey();
      const existing = await this.prisma.depositAddress.findUnique({
        where: { address },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      throw new ConflictException('Failed to generate a unique address');
    }

    const depositAddress = await this.prisma.depositAddress.create({
      data: { address, walletId, network, label: label ?? null },
    });

    return {
      id: depositAddress.id,
      address: depositAddress.address,
      walletId: depositAddress.walletId,
      network: depositAddress.network,
      status: depositAddress.status,
      label: depositAddress.label,
      allocatedAt: depositAddress.allocatedAt,
    };
  }

  async listByWallet(userId: string, walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId, isActive: true },
    });
    if (!wallet || wallet.userId !== userId)
      throw new NotFoundException('Wallet not found');

    return this.prisma.depositAddress.findMany({
      where: { walletId },
      orderBy: { allocatedAt: 'desc' },
    });
  }
}
