import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A one-tap button that copies [address] to the clipboard and shows a
/// transient "Copied" confirmation.
class CopyAddressButton extends StatefulWidget {
  final String address;

  const CopyAddressButton({super.key, required this.address});

  @override
  State<CopyAddressButton> createState() => _CopyAddressButtonState();
}

class _CopyAddressButtonState extends State<CopyAddressButton> {
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.address));
    if (!mounted) return;
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: _copy,
      icon: Icon(_copied ? Icons.check : Icons.copy, size: 18),
      label: Text(_copied ? 'Copied' : 'Copy address'),
    );
  }
}
