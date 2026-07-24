import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/network/api_client.dart';
import 'package:firebase_core/firebase_core.dart';
import 'app.dart';
import 'core/push_notification_service.dart';

void main() async {
  Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await MonitoringService.init();   // ← Add this line
  
  runApp(const MyApp());
}

  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables
  await dotenv.load(fileName: ".env");
  
  // Initialize API client
  ApiClient().initialize();
  
  await Firebase.initializeApp();
  
  // Initialize Push Notifications
  await PushNotificationService().init();
  
  runApp(const IgnitionPayApp());
}