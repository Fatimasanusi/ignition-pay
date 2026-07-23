import 'package:test/test.dart';
import 'package:stellar_address_kit/stellar_address_kit.dart';

void main() {
  group('validateStellar', () {
    test('returns valid for classic G address', () {
      const address =
          'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
      final result = validateDetailed(address);
      expect(result.isValid, isTrue);
      expect(result.kind, equals(AddressKind.g));
      expect(result.network, equals(BlockchainNetwork.stellar));
    });

    test('returns valid for muxed M address', () {
      const address =
          'MAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQACAAAAAAAAAAAAD672';
      final result = validateDetailed(address);
      expect(result.isValid, isTrue);
      expect(result.kind, equals(AddressKind.m));
    });

    test('returns valid for contract C address', () {
      const address =
          'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
      final result = validateDetailed(address);
      expect(result.isValid, isTrue);
      expect(result.kind, equals(AddressKind.c));
    });

    test('returns invalid for empty address', () {
      final result = validateDetailed('');
      expect(result.isValid, isFalse);
      expect(result.errorCode, equals('EMPTY_ADDRESS'));
    });

    test('returns invalid for seed key (S prefix)', () {
      final result = validateDetailed('SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      expect(result.isValid, isFalse);
      expect(result.errorCode, equals(ErrorCode.unknownPrefix));
    });

    test('returns invalid for unknown prefix', () {
      final result = validateDetailed('NOTANADDRESS');
      expect(result.isValid, isFalse);
      expect(result.errorCode, equals(ErrorCode.unknownPrefix));
    });

    test('returns invalid for federation address', () {
      final result = validateDetailed('user*domain.com');
      expect(result.isValid, isFalse);
      expect(result.errorCode, equals(ErrorCode.unknownPrefix));
    });

    test('strict mode rejects lowercase', () {
      const address =
          'gaycuyt553c5lhve2xpw5gmejt4bxgm7ahmjwlapzp53kjo7eiqadrsi';
      final result = validateDetailed(address, strict: true);
      expect(result.isValid, isFalse);
    });

    test('non-strict accepts lowercase', () {
      const address =
          'gaycuyt553c5lhve2xpw5gmejt4bxgm7ahmjwlapzp53kjo7eiqadrsi';
      final result = validateDetailed(address);
      expect(result.isValid, isTrue);
    });

    test('returns structured error for invalid base32', () {
      final result =
          validateDetailed('GInvalid!@@@@@@O000000000000000000000000000000000000000');
      expect(result.isValid, isFalse);
      expect(result.errorCode, equals(ErrorCode.invalidBase32));
    });
  });

  group('validateEthereum', () {
    test('valid Ethereum address', () {
      final result =
          validateBlockchainAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
              network: BlockchainNetwork.ethereum);
      expect(result.isValid, isTrue);
    });

    test('invalid - no 0x prefix', () {
      final result =
          validateBlockchainAddress('742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
              network: BlockchainNetwork.ethereum);
      expect(result.isValid, isFalse);
    });

    test('invalid - wrong length', () {
      final result =
          validateBlockchainAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD',
              network: BlockchainNetwork.ethereum);
      expect(result.isValid, isFalse);
    });

    test('invalid - non-hex characters', () {
      final result =
          validateBlockchainAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
              network: BlockchainNetwork.ethereum);
      expect(result.isValid, isFalse);
    });
  });

  group('validateBitcoin', () {
    test('valid P2PKH address', () {
      final result = validateBlockchainAddress(
          '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          network: BlockchainNetwork.bitcoin);
      expect(result.isValid, isTrue);
    });

    test('valid P2SH address', () {
      final result = validateBlockchainAddress(
          '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
          network: BlockchainNetwork.bitcoin);
      expect(result.isValid, isTrue);
    });

    test('valid bech32 address', () {
      final result = validateBlockchainAddress(
          'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          network: BlockchainNetwork.bitcoin);
      expect(result.isValid, isTrue);
    });

    test('invalid prefix', () {
      final result = validateBlockchainAddress('XInvalidAddress',
          network: BlockchainNetwork.bitcoin);
      expect(result.isValid, isFalse);
    });
  });

  group('validateSolana', () {
    test('valid Solana address', () {
      final result = validateBlockchainAddress(
          '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV2',
          network: BlockchainNetwork.solana);
      expect(result.isValid, isTrue);
    });

    test('invalid - too short', () {
      final result = validateBlockchainAddress('Short',
          network: BlockchainNetwork.solana);
      expect(result.isValid, isFalse);
    });
  });

  group('validateMultiChain', () {
    test('detects Stellar G address', () {
      const address =
          'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
      final result = validateMultiChain(address);
      expect(result.isValid, isTrue);
      expect(result.validNetworks, contains(BlockchainNetwork.stellar));
    });

    test('detects Ethereum address', () {
      final result =
          validateMultiChain('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
      expect(result.isValid, isTrue);
      expect(result.validNetworks, contains(BlockchainNetwork.ethereum));
    });

    test('detects Bitcoin address', () {
      final result = validateMultiChain(
          '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(result.isValid, isTrue);
      expect(result.validNetworks, contains(BlockchainNetwork.bitcoin));
    });

    test('returns invalid for nonsense', () {
      final result = validateMultiChain('notAnAddress');
      expect(result.isValid, isFalse);
    });
  });

  group('validateBlockchainAddress auto-detect', () {
    test('auto-detects Stellar G address', () {
      const address =
          'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
      final result = validateBlockchainAddress(address);
      expect(result.isValid, isTrue);
      expect(result.network, equals(BlockchainNetwork.stellar));
    });

    test('auto-detects ethereum address', () {
      final result =
          validateBlockchainAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
      expect(result.isValid, isTrue);
      expect(result.network, equals(BlockchainNetwork.ethereum));
    });
  });

  group('legacy validate function', () {
    test('returns true for valid G address', () {
      const address =
          'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
      expect(validate(address), isTrue);
    });

    test('returns false for invalid address', () {
      expect(validate('invalid'), isFalse);
    });
  });

  group('Ripple validation', () {
    test('valid Ripple address', () {
      final result = validateBlockchainAddress(
          'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
          network: BlockchainNetwork.ripple);
      expect(result.isValid, isTrue);
    });

    test('invalid Ripple prefix', () {
      final result = validateBlockchainAddress(
          'XHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
          network: BlockchainNetwork.ripple);
      expect(result.isValid, isFalse);
    });
  });

  group('Cardano validation', () {
    test('valid Cardano address', () {
      final result = validateBlockchainAddress(
          'addr1qy6r3h7r5xw3q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8',
          network: BlockchainNetwork.cardano);
      expect(result.isValid, isTrue);
    });

    test('invalid Cardano prefix', () {
      final result = validateBlockchainAddress(
          'invalid1address',
          network: BlockchainNetwork.cardano);
      expect(result.isValid, isFalse);
    });
  });

  group('Polkadot validation', () {
    test('valid Polkadot address', () {
      final result = validateBlockchainAddress(
          '1EXtSJ5PTqNqDpY7vL5HqMq3q3q3q3q3q3q3q3q3q3q3',
          network: BlockchainNetwork.polkadot);
      expect(result.isValid, isTrue);
    });

    test('invalid Polkadot length', () {
      final result = validateBlockchainAddress(
          'short',
          network: BlockchainNetwork.polkadot);
      expect(result.isValid, isFalse);
    });
  });
}
