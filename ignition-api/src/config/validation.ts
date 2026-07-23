import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StrKey } from '@stellar/stellar-sdk';

@Injectable()
export class ConfigValidationService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.validateAdminWallets();
  }

  private validateAdminWallets() {
    const adminWalletsStr = this.configService.get<string>('ADMIN_WALLETS', '');
    if (!adminWalletsStr.trim()) {
      return;
    }

    const adminWallets = adminWalletsStr
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);

    for (const wallet of adminWallets) {
      if (!StrKey.isValidEd25519PublicKey(wallet)) {
        throw new Error(
          `Invalid Stellar public key in ADMIN_WALLETS: "${wallet}". ` +
            `Please check your configuration.`,
        );
      }
    }
  }
}
