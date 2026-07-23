import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ignition Pay'),
        centerTitle: true,
      ),
      body: const Center(
        child: Text(
          'Welcome to Ignition Pay',
          style: TextStyle(fontSize: 18),
        ),
      ),
    );
  }
}
