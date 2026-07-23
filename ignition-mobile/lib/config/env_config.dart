import 'package:flutter/foundation.dart';

class EnvConfig {
  static final EnvConfig _instance = EnvConfig._internal();
  factory EnvConfig() => _instance;
  EnvConfig._internal();

  String get apiBaseUrl => const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://localhost:3000',
      );

  bool get isProduction => const bool.fromEnvironment(
        'PRODUCTION',
        defaultValue: false,
      );

  bool get isDebug => kDebugMode;
}
