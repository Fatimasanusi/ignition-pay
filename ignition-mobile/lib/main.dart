import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'app.dart';
import 'core/monitoring_service.dart';
import 'core/network/api_client.dart';
import 'core/push_notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables from .env (API_BASE_URL, SENTRY_DSN, …)
  await dotenv.load(fileName: '.env');

  // Initialise crash reporting (Firebase Crashlytics + Sentry).
  // [MonitoringService.init] also handles Firebase.initializeApp() and sets
  // up the Flutter / PlatformDispatcher error handlers before runApp is called.
  //
  // The [runApp] callback is invoked by SentryFlutter.init so that Sentry
  // can wrap the widget tree inside its own error-capture zone.
  await MonitoringService.init(
    runApp: () async {
      // Services that depend on Firebase being ready go here.
      ApiClient().initialize();
      await PushNotificationService().init();
      runApp(const IgnitionPayApp());
    },
  );
}
