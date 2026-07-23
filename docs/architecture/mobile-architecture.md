# Mobile Architecture

## Stack

- **Framework**: Flutter 3.22+
- **Language**: Dart 3.4+
- **State Management**: Provider / Riverpod
- **API Client**: `http` / `dio` for REST calls
- **Local Storage**: `shared_preferences`, `drift` (SQLite)

## Directory Structure

```
lib/
├── main.dart              # App entry point
├── app.dart               # Material app configuration
├── core/                  # Core utilities
│   ├── constants.dart     # App-wide constants
│   ├── theme/             # Theme configuration
│   ├── network/           # API client setup
│   └── storage/           # Local storage helpers
├── config/                # Environment config
└── features/              # Feature modules
    ├── home/              # Home/wallet screen
    ├── send/              # Send flow
    ├── receive/           # Receive flow
    ├── history/           # Transaction history
    ├── settings/          # Settings screen
    └── auth/              # Authentication
```

## Architecture Pattern

The mobile app follows a feature-first architecture:

- Each feature is self-contained with its own models, services, and UI
- Shared code lives in `core/`
- The API client in `core/network` handles all backend communication
- State is managed with Providers, scoped per feature

## Platform Features

- **Biometric auth**: Fingerprint / Face ID via `local_auth`
- **Deep linking**: Handle payment request URLs
- **Push notifications**: Firebase Cloud Messaging
- **QR scanning**: Scan Stellar addresses with `mobile_scanner`
- **Secure storage**: FlutterSecureStorage for keys

## Build Targets

| Target | Command |
|--------|---------|
| Android | `flutter build apk` |
| iOS | `flutter build ios` |
| Web | `flutter build web` |
