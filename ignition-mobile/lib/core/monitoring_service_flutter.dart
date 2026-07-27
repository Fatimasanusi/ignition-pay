/// Flutter/Firebase [MonitoringService] implementation for mobile and web.
///
/// This implementation is selected when [dart.library.ui] is present
/// (i.e. a Flutter engine is available).
///
/// Initialises:
/// - **Firebase Crashlytics** — automatic crash reporting on Android/iOS.
///   Skipped on Flutter Web (Crashlytics does not support web).
/// - **Sentry** — error and performance monitoring (configured via
///   `--dart-define=SENTRY_DSN=<dsn>` at build time, or via `.env`).
///
/// Usage in main.dart:
/// ```dart
/// await MonitoringService.init(
///   runApp: () async {
///     runApp(const MyApp());
///   },
/// );
/// ```
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

class MonitoringService {
  MonitoringService._();

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /// Initialises crash reporting and error monitoring, then invokes [runApp].
  ///
  /// Call this once, as early as possible in [main], **before** calling
  /// Flutter's `runApp`.  [runApp] is forwarded to [SentryFlutter.init] so
  /// that Sentry can capture errors that occur during app start-up.
  ///
  /// When [SENTRY_DSN] is empty (e.g. in local development), [runApp] is
  /// called directly so the app still starts normally.
  static Future<void> init({Future<void> Function()? runApp}) async {
    // --- Firebase Crashlytics (Android / iOS only) --------------------------
    if (!kIsWeb) {
      await Firebase.initializeApp();

      // Forward Flutter framework errors (render exceptions, etc.) to
      // Crashlytics so they appear in the Firebase console.
      FlutterError.onError =
          FirebaseCrashlytics.instance.recordFlutterFatalError;

      // Forward async errors that escape the root Flutter zone (e.g. Future
      // callbacks that throw before runApp is called).
      PlatformDispatcher.instance.onError = (error, stack) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
        return true;
      };
    }

    // --- Sentry (all platforms) ---------------------------------------------
    // SENTRY_DSN is injected at build time via:
    //   flutter run --dart-define=SENTRY_DSN=https://...
    const sentryDsn = String.fromEnvironment('SENTRY_DSN');

    if (sentryDsn.isNotEmpty) {
      await SentryFlutter.init(
        (options) {
          options.dsn = sentryDsn;
          // Capture 100 % of traces; tune down in high-traffic production.
          options.tracesSampleRate = 1.0;
          options.attachStacktrace = true;
          options.environment =
              kReleaseMode ? 'production' : 'development';
        },
        appRunner: runApp,
      );
    } else {
      // No Sentry DSN — invoke the runApp callback directly.
      await runApp?.call();
    }
  }

  // ---------------------------------------------------------------------------
  // Error reporting
  // ---------------------------------------------------------------------------

  /// Records [exception] and its [stackTrace] to all active monitoring
  /// backends (Crashlytics and Sentry).
  ///
  /// Set [fatal] to `true` for unrecoverable errors.  Supply an optional
  /// [reason] string to add human-readable context in the dashboards.
  static Future<void> recordError(
    Object exception,
    StackTrace? stackTrace, {
    String? reason,
    bool fatal = false,
  }) async {
    if (!kIsWeb) {
      await FirebaseCrashlytics.instance.recordError(
        exception,
        stackTrace,
        reason: reason,
        fatal: fatal,
      );
    }
    await Sentry.captureException(
      exception,
      stackTrace: stackTrace,
      hint: reason != null ? Hint.withMap({'reason': reason}) : null,
    );
  }

  // ---------------------------------------------------------------------------
  // Breadcrumbs / logging
  // ---------------------------------------------------------------------------

  /// Adds a breadcrumb to Sentry and, on non-web builds, a log line to
  /// Crashlytics so it appears alongside crash reports.
  static void log(String message) {
    if (!kIsWeb) {
      FirebaseCrashlytics.instance.log(message);
    }
    Sentry.addBreadcrumb(Breadcrumb(message: message));
  }

  // ---------------------------------------------------------------------------
  // User identity
  // ---------------------------------------------------------------------------

  /// Associates subsequent monitoring events with the given user [id].
  ///
  /// Pass `null` to clear the identity on sign-out.
  static Future<void> setUserId(String? id) async {
    if (!kIsWeb) {
      await FirebaseCrashlytics.instance.setUserIdentifier(id ?? '');
    }
    await Sentry.configureScope(
      (scope) => scope.setUser(id != null ? SentryUser(id: id) : null),
    );
  }
}
