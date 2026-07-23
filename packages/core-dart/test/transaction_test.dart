import 'package:test/test.dart';
import 'package:stellar_address_kit/stellar_address_kit.dart';

void main() {
  group('TransactionBuilder', () {
    const validGAddress =
        'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
    const validDestination =
        'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

    test('builds a valid transaction with required fields', () {
      final tx = TransactionBuilder()
          .setSourceAccount(validGAddress)
          .setSequenceNumber(BigInt.from(12345))
          .addPayment(
            destination: validDestination,
            amount: '100.50',
          )
          .build();

      expect(tx.sourceAccount, equals(validGAddress));
      expect(tx.sequenceNumber, equals(BigInt.from(12345)));
      expect(tx.fee, equals(100));
      expect(tx.memoType, equals('none'));
      expect(tx.operations.length, equals(1));
      expect(tx.operations[0].destination, equals(validDestination));
      expect(tx.operations[0].amount, equals('100.50'));
    });

    test('throws when source account is missing', () {
      expect(
        () => TransactionBuilder()
            .setSequenceNumber(BigInt.from(1))
            .addPayment(destination: validDestination, amount: '10')
            .build(),
        throwsA(isA<TransactionValidationException>()),
      );
    });

    test('throws when sequence number is missing', () {
      expect(
        () => TransactionBuilder()
            .setSourceAccount(validGAddress)
            .addPayment(destination: validDestination, amount: '10')
            .build(),
        throwsA(isA<TransactionValidationException>()),
      );
    });

    test('throws when no operations added', () {
      expect(
        () => TransactionBuilder()
            .setSourceAccount(validGAddress)
            .setSequenceNumber(BigInt.from(1))
            .build(),
        throwsA(isA<TransactionValidationException>()),
      );
    });

    test('accepts memo ID', () {
      final tx = TransactionBuilder()
          .setSourceAccount(validGAddress)
          .setSequenceNumber(BigInt.from(1))
          .setMemoId(BigInt.from(42))
          .addPayment(destination: validDestination, amount: '10')
          .build();

      expect(tx.memoType, equals('id'));
      expect(tx.memoValue, equals('42'));
    });

    test('accepts memo text', () {
      final tx = TransactionBuilder()
          .setSourceAccount(validGAddress)
          .setSequenceNumber(BigInt.from(1))
          .setMemoText('Hello')
          .addPayment(destination: validDestination, amount: '10')
          .build();

      expect(tx.memoType, equals('text'));
      expect(tx.memoValue, equals('Hello'));
    });

    test('accepts time bounds', () {
      final now = DateTime.now();
      final later = now.add(const Duration(hours: 1));
      final tx = TransactionBuilder()
          .setSourceAccount(validGAddress)
          .setSequenceNumber(BigInt.from(1))
          .setTimeBounds(minTime: now, maxTime: later)
          .addPayment(destination: validDestination, amount: '10')
          .build();

      expect(tx.timeBoundMin, equals(now));
      expect(tx.timeBoundMax, equals(later));
    });

    test('supports multiple operations', () {
      const dest2 = 'GDXJQBQN6X3CRN5X7LQZ5X7LQZ5X7LQZ5X7LQZ5X7LQZ5X7LQZ5X7LQZ5';
      final tx = TransactionBuilder()
          .setSourceAccount(validGAddress)
          .setSequenceNumber(BigInt.from(1))
          .addPayment(destination: validDestination, amount: '10')
          .addPayment(destination: dest2, amount: '20', asset: 'USDC')
          .build();

      expect(tx.operations.length, equals(2));
      expect(tx.operations[1].asset, equals('USDC'));
    });

    test('custom fee', () {
      final tx = TransactionBuilder()
          .setSourceAccount(validGAddress)
          .setSequenceNumber(BigInt.from(1))
          .setFee(500)
          .addPayment(destination: validDestination, amount: '10')
          .build();

      expect(tx.fee, equals(500));
    });

    test('throws for invalid destination', () {
      expect(
        () => TransactionBuilder()
            .setSourceAccount(validGAddress)
            .setSequenceNumber(BigInt.from(1))
            .addPayment(destination: 'invalid', amount: '10')
            .build(),
        throwsA(isA<TransactionValidationException>()),
      );
    });

    test('throws for negative amount', () {
      expect(
        () => TransactionBuilder()
            .setSourceAccount(validGAddress)
            .setSequenceNumber(BigInt.from(1))
            .addPayment(destination: validDestination, amount: '-10')
            .build(),
        throwsA(isA<TransactionValidationException>()),
      );
    });
  });

  group('validateTransaction', () {
    const validGAddress =
        'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
    const validDestination =
        'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

    test('returns empty errors for valid transaction', () {
      final tx = Transaction(
        sourceAccount: validGAddress,
        sequenceNumber: BigInt.from(1),
        operations: [
          const PaymentOperation(
              destination: validDestination, asset: 'XLM', amount: '10'),
        ],
      );

      final errors = validateTransaction(tx);
      expect(errors, isEmpty);
    });

    test('detects missing operations', () {
      final tx = Transaction(
        sourceAccount: validGAddress,
        sequenceNumber: BigInt.from(1),
      );

      final errors = validateTransaction(tx);
      expect(errors, isNotEmpty);
    });
  });

  group('signTransaction', () {
    test('creates signed transaction', () {
      const validGAddress =
          'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
      const validDestination =
          'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

      final tx = Transaction(
        sourceAccount: validGAddress,
        sequenceNumber: BigInt.from(1),
        operations: [
          const PaymentOperation(
              destination: validDestination, asset: 'XLM', amount: '10'),
        ],
      );

      final signed = signTransaction(
        tx,
        'GPublicKey123',
        'deadbeef',
        'txhash123',
      );

      expect(signed.signatures, contains('deadbeef'));
      expect(signed.signers, contains('GPublicKey123'));
      expect(signed.hash, equals('txhash123'));
    });
  });

  group('Transaction.toJson', () {
    test('produces correct JSON structure', () {
      const validGAddress =
          'GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI';
      const validDestination =
          'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

      final tx = Transaction(
        sourceAccount: validGAddress,
        sequenceNumber: BigInt.from(123),
        fee: 200,
        memoType: 'id',
        memoValue: '42',
        timeBoundMin: DateTime.fromMillisecondsSinceEpoch(0),
        timeBoundMax: DateTime.fromMillisecondsSinceEpoch(1000000),
        operations: [
          const PaymentOperation(
              destination: validDestination, asset: 'XLM', amount: '50'),
        ],
      );

      final json = tx.toJson();
      expect(json['sourceAccount'], equals(validGAddress));
      expect(json['sequenceNumber'], equals('123'));
      expect(json['fee'], equals(200));
      expect(json['memo']['type'], equals('id'));
      expect(json['memo']['value'], equals('42'));
      expect(json['operations'].length, equals(1));
    });
  });
}
