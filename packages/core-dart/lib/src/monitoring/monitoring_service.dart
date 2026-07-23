import 'package:flutter/foundation.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:logging/logging.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

class MonitoringService {
  static final Logger _logger = Logger('IgnitionPay');

  static Future<void> init() async {
    // Setup structured logging
    Logger.root.level = Level.ALL;
    Logger.root.onRecord.listen((record) {
      if (kDebugMode) {
        debugPrint('${record.level.name}: ${record.message}');
      }
      if (record.error != null) {
        Sentry.captureException(record.error, stackTrace: record.stackTrace);
      }
    });

    // Sentry - Error tracking + Performance Monitoring
    await SentryFlutter.init((options) {
      options.dsn = const String.fromEnvironment('SENTRY_DSN', defaultValue: '');
      options.tracesSampleRate = 0.35;
      options.profilesSampleRate = 0.15;
      options.environment = kReleaseMode ? 'production' : 'development';
      options.debug = kDebugMode;

      options.addEventProcessor((event, hint) {
        event.tags ??= {};
        event.tags!['platform'] = defaultTargetPlatform.toString();
        event.tags!['version'] = '1.0.0';
        return event;
      });
    });

    // Firebase Crashlytics
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(!kDebugMode);
    
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterError;
  }

  // === Convenience Methods ===

  static void info(String message, [Map<String, dynamic>? data]) {
    _logger.info(message);
    Sentry.addBreadcrumb(Breadcrumb(message: message, level: SentryLevel.info, data: data));
  }

  static void warning(String message, [dynamic error]) {
    _logger.warning(message, error);
    Sentry.captureMessage(message, level: SentryLevel.warning);
  }

  static void error(String message, dynamic error, [StackTrace? stack]) {
    _logger.severe(message, error, stack);
    Sentry.captureException(error, stackTrace: stack);
    FirebaseCrashlytics.instance.recordError(error, stack ?? StackTrace.current);
  }

  // Performance tracing wrapper
  static Future<T> trace<T>(String name, Future<T> Function() action) async {
    final tx = Sentry.startTransaction(name, 'ui');
    try {
      return await action();
    } catch (e, st) {
      tx.throwable = e;
      rethrow;
    } finally {
      await tx.finish();
    }
  }
}