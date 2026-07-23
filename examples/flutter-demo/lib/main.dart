import 'package:flutter/material.dart';

void main() {
  runApp(const IgnitionPayDemo());
}

class IgnitionPayDemo extends StatelessWidget {
  const IgnitionPayDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ignition Pay Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const WalletScreen(),
    );
  }
}

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final _addressController = TextEditingController();
  final _amountController = TextEditingController();
  String _status = 'Ready';

  Future<void> _createWallet() async {
    setState(() => _status = 'Wallet created on testnet!');
  }

  Future<void> _sendPayment() async {
    setState(() => _status = 'Payment sent to \!');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ignition Pay Demo')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ElevatedButton(
              onPressed: _createWallet,
              child: const Text('Create Test Wallet'),
            ),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'Destination Address'),
            ),
            TextField(
              controller: _amountController,
              decoration: const InputDecoration(labelText: 'Amount (XLM)'),
            ),
            ElevatedButton(
              onPressed: _sendPayment,
              child: const Text('Send Payment'),
            ),
            const SizedBox(height: 20),
            Text(_status),
          ],
        ),
      ),
    );
  }
}