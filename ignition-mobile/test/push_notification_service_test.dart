import 'package:flutter_test/flutter_test.dart';
import 'package:ignition_mobile/core/push_notification_service.dart';

void main() {
  group('PushNotificationService', () {
    test('should be a singleton instance', () {
      final instance1 = PushNotificationService();
      final instance2 = PushNotificationService();
      
      expect(identical(instance1, instance2), isTrue);
    });
  });
}
