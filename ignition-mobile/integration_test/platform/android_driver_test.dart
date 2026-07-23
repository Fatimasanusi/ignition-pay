// Device driver test — Android-specific platform behaviour.
//
// What this test guards:
//   * `PushNotificationService.init()` registers the Android notification
//     channel `high_importance_channel` with `Importance.max`.
//   * The FirebaseMessaging background handler is registered.
//   * Foreground RemoteMessages trigger a local notification via
//     flutter_local_notifications.
//
// These tests only run on a real Android emulator/device. When executed on
// an iOS sim / host VM each test is *skipped entirely* via the `skip:`
// constructor parameter so no MethodChannel invocations run on a platform
// that doesn't support them.
//
// Scope limitation: the mocks below shadow the real `firebase_messaging` and
// `flutter_local_notifications` channels, so on a real device these tests
// verify the *Dart-side code path* of `init()` rather than whether the call
// actually registered a notification channel on the OS. Verifying real
// platform behaviour requires a Firebase-configured CI runtime and is out
// of scope for this suite.

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:ignition_mobile/core/push_notification_service.dart';

import '../setup/test_bindings.dart';

/// One-line alias for the shared `stubPushNotificationChannels(binding)`
/// helper in `setup/test_bindings.dart`. Kept here so each call site reads
/// naturally and is explicit about which platform the suite targets.
void stubAndroidPushNotificationChannels(IntegrationTestWidgetsFlutterBinding binding) =>
    stubPushNotificationChannels(binding);

void main() {
  ensureIntegrationBinding();

  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  // Compiled once; reused as the `skip:` argument on every test below.
  final onAndroid = currentIntegrationPlatform() == IntegrationPlatform.android
      ? null
      : 'Android-only platform driver.';

  test(
    'Notification channel `high_importance_channel` is registered with max importance',
    () async {
      addTearDown(() => clearPushNotificationChannelMocks(binding));

      stubAndroidPushNotificationChannels(binding);

      // Override the local-notifications stub just for this test so the
      // `getNotificationChannels` query returns the canned channel list
      // we expect init() to register.
      const localChannel = MethodChannel('dexterous.com/flutter/local_notifications');
      binding.defaultBinaryMessenger.setMockMethodCallHandler(localChannel, (call) async {
        if (call.method == 'getNotificationChannels') {
          return <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'high_importance_channel',
              'name': 'High Importance Notifications',
              'importance': 5, // Importance.max
            },
          ];
        }
        return null;
      });

      await PushNotificationService().init();
      final listed = await localChannel.invokeMethod<List<dynamic>>('getNotificationChannels');
      expect(listed, isNotNull);
      final found = (listed ?? <dynamic>[]).cast<Map>().firstWhere(
            (c) => c['id'] == 'high_importance_channel',
            orElse: () => <String, dynamic>{},
          );
      expect(found, isNotEmpty);
      expect(found['importance'], 5 /* Importance.max */);
    },
    skip: onAndroid,
  );

  test(
    'FirebaseMessaging background handler is registered',
    () async {
      addTearDown(() => clearPushNotificationChannelMocks(binding));

      stubAndroidPushNotificationChannels(binding);

      bool? registered = false;
      const fcmChannel = MethodChannel('plugins.flutter.io/firebase_messaging');
      binding.defaultBinaryMessenger.setMockMethodCallHandler(fcmChannel, (call) async {
        if (call.method == 'hasBackgroundHandlerRegistered') {
          registered = true;
          return true;
        }
        if (call.method == 'requestPermission' ||
            call.method == 'initialize' ||
            call.method == 'setBackgroundMessageHandler' ||
            call.method == 'setForegroundNotificationPresentationOptions') {
          return true;
        }
        return null;
      });

      await PushNotificationService().init();
      expect(await fcmChannel.invokeMethod<bool>('hasBackgroundHandlerRegistered'), isTrue);
      expect(registered, isTrue);
    },
    skip: onAndroid,
  );

  test(
    'Foreground RemoteMessage triggers local notification show()',
    () async {
      addTearDown(() => clearPushNotificationChannelMocks(binding));

      stubAndroidPushNotificationChannels(binding);

      Map<dynamic, dynamic>? recordedShow;
      const localChannel = MethodChannel('dexterous.com/flutter/local_notifications');
      binding.defaultBinaryMessenger.setMockMethodCallHandler(localChannel, (call) async {
        if (call.method == 'show') {
          recordedShow = Map<dynamic, dynamic>.from(call.arguments as Map);
        }
        return null;
      });

      await PushNotificationService().init();
      await binding.pumpAndSettle();

      const fcmChannel = MethodChannel('plugins.flutter.io/firebase_messaging');
      final codec = StandardMethodCodec();
      final call = MethodCall('onMessage', {
        'messageId': '1234',
        'notification': {
          'title': 'Payment Received',
          'body': 'You got 100 XLM',
        },
        'data': <String, dynamic>{},
      });

      await binding.defaultBinaryMessenger.handlePlatformMessage(
        fcmChannel.name,
        codec.encodeMethodCall(call),
        (_) {},
      );
      await binding.pumpAndSettle();

      expect(recordedShow, isNotNull);
      expect(recordedShow!['title'], 'Payment Received');
      expect(recordedShow['body'], 'You got 100 XLM');
    },
    skip: onAndroid,
  );
}
