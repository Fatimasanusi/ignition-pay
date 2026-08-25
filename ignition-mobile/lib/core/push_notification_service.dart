import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("Handling a background message: ${message.messageId}");
}

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotificationsPlugin = FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  Future<void> init() async {
    if (_isInitialized) return;

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Initialize local notifications for foreground popups
    const AndroidInitializationSettings androidInitSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iosInitSettings = DarwinInitializationSettings();
    const InitializationSettings initSettings = InitializationSettings(
      android: androidInitSettings,
      iOS: iosInitSettings,
    );

    await _localNotificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        _handleTap(response.payload);
      },
    );

    // Create Android notification channel
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'high_importance_channel',
      'High Importance Notifications',
      description: 'This channel is used for important notifications.',
      importance: Importance.max,
    );

    await _localNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    await _fcm.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null && !kIsWeb) {
        // Derive a stable integer ID from the FCM messageId so that
        // flutter_local_notifications can identify (and replace) an already-
        // displayed alert when the same FCM message is delivered more than
        // once (e.g. after a reconnect or a duplicate server dispatch).
        //
        // notification.hashCode was used previously, but Dart's default
        // hashCode is based on object identity — it changes on every new
        // RemoteNotification instance, so every duplicate delivery produced
        // a brand-new tray entry instead of replacing the existing one.
        //
        // We fold the messageId string into a positive 32-bit integer by
        // summing Unicode code-unit values with a simple Bernstein-style
        // rotation, then masking to stay within the signed-32-bit range
        // that Android's notification manager requires.
        final int notificationId = _stableIdFromMessageId(message.messageId);

        _localNotificationsPlugin.show(
          notificationId,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              channel.id,
              channel.name,
              channelDescription: channel.description,
              icon: '@mipmap/ic_launcher',
            ),
          ),
          payload: message.data.toString(),
        );
      }
    });

    // Handle app opened from terminated state
    RemoteMessage? initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      _handleRemoteMessageTap(initialMessage);
    }

    // Handle app opened from background state
    FirebaseMessaging.onMessageOpenedApp.listen(_handleRemoteMessageTap);

    // Request permissions
    await requestPermission();

    _isInitialized = true;
  }

  Future<void> requestPermission() async {
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
    debugPrint('User granted permission: ${settings.authorizationStatus}');
  }

  Future<String?> getToken() async {
    return await _fcm.getToken();
  }

  void _handleRemoteMessageTap(RemoteMessage message) {
    debugPrint("Notification tapped with payload: ${message.data}");
    // Route user based on message.data here in the future
  }

  void _handleTap(String? payload) {
    if (payload != null) {
      debugPrint("Local notification tapped with payload: $payload");
      // Route user based on payload here in the future
    }
  }

  /// Converts a (possibly null) FCM messageId string into a stable positive
  /// 32-bit integer suitable for use as a `flutter_local_notifications` ID.
  ///
  /// Android's notification manager uses the ID to identify a notification
  /// slot — showing a new notification with the same ID replaces the old one.
  /// Using a deterministic function of the FCM messageId means that if the
  /// same logical notification is delivered more than once (duplicate SSE
  /// event → duplicate FCM dispatch) only one tray entry will ever appear.
  ///
  /// Algorithm: Bernstein djb2-style hash — cheap, collision-resistant enough
  /// for this use case, and pure Dart with no extra dependencies.
  static int _stableIdFromMessageId(String? messageId) {
    if (messageId == null || messageId.isEmpty) {
      // Fallback: no messageId available, use a fixed sentinel so we still
      // avoid showing multiple identical "unknown" alerts.
      return 0;
    }
    int hash = 5381;
    for (final int codeUnit in messageId.codeUnits) {
      // hash = ((hash << 5) + hash) + codeUnit  (i.e. hash * 33 + codeUnit)
      hash = (hash * 33 + codeUnit) & 0x7fffffff; // keep positive 31-bit int
    }
    return hash;
  }

  /// Public alias for [_stableIdFromMessageId], exposed so unit tests can
  /// exercise the hashing logic without a live FCM / Firebase environment.
  @visibleForTesting
  static int stableIdFromMessageId(String? messageId) =>
      _stableIdFromMessageId(messageId);
}
