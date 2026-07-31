import 'package:flutter/material.dart';

/// Surfaces the network fee for a pending send so the cost is never
/// hidden from the user before they confirm the transaction.
class FeeDisclosure extends StatelessWidget {
  final String feeAmount;
  final String assetCode;

  const FeeDisclosure({
    super.key,
    required this.feeAmount,
    required this.assetCode,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Network fee', style: Theme.of(context).textTheme.bodyMedium),
        Text(
          '$feeAmount $assetCode',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}
