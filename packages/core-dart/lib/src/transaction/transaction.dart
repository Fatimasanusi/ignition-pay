import 'package:meta/meta.dart';

/// Represents a payment operation in a Stellar transaction.
@immutable
class PaymentOperation {
  /// The destination address (G, M, or C).
  final String destination;

  /// The asset code (e.g., 'XLM', 'USDC').
  final String asset;

  /// The amount to send as a string to preserve precision.
  final String amount;

  const PaymentOperation({
    required this.destination,
    required this.asset,
    required this.amount,
  });

  Map<String, dynamic> toJson() => {
        'type': 'payment',
        'destination': destination,
        'asset': asset,
        'amount': amount,
      };
}

/// Represents a Stellar transaction before signing.
@immutable
class Transaction {
  /// The source account address.
  final String sourceAccount;

  /// The sequence number for the transaction.
  final BigInt sequenceNumber;

  /// The fee (in stroops) for the transaction.
  final int fee;

  /// The memo type (none, id, text, hash, return).
  final String memoType;

  /// The memo value.
  final String? memoValue;

  /// The time bound minimum (Unix timestamp).
  final DateTime? timeBoundMin;

  /// The time bound maximum (Unix timestamp).
  final DateTime? timeBoundMax;

  /// The list of operations in the transaction.
  final List<PaymentOperation> operations;

  const Transaction({
    required this.sourceAccount,
    required this.sequenceNumber,
    this.fee = 100,
    this.memoType = 'none',
    this.memoValue,
    this.timeBoundMin,
    this.timeBoundMax,
    this.operations = const [],
  });

  Map<String, dynamic> toJson() => {
        'sourceAccount': sourceAccount,
        'sequenceNumber': sequenceNumber.toString(),
        'fee': fee,
        'memo': {
          'type': memoType,
          if (memoValue != null) 'value': memoValue,
        },
        'timeBounds': {
          if (timeBoundMin != null)
            'minTime': timeBoundMin!.millisecondsSinceEpoch ~/ 1000,
          if (timeBoundMax != null)
            'maxTime': timeBoundMax!.millisecondsSinceEpoch ~/ 1000,
        },
        'operations': operations.map((op) => op.toJson()).toList(),
      };
}

/// Represents a signed transaction ready for submission.
@immutable
class SignedTransaction {
  /// The unsigned transaction.
  final Transaction transaction;

  /// The signature(s) as hex-encoded strings.
  final List<String> signatures;

  /// The public key(s) that signed the transaction.
  final List<String> signers;

  /// The hash of the transaction (used as the transaction ID).
  final String hash;

  const SignedTransaction({
    required this.transaction,
    required this.signatures,
    required this.signers,
    required this.hash,
  });

  Map<String, dynamic> toJson() => {
        'transaction': transaction.toJson(),
        'signatures': signatures,
        'signers': signers,
        'hash': hash,
      };
}
