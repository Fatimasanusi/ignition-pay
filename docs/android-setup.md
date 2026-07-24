# Android Development Environment Setup

## Prerequisites

- macOS (Apple Silicon or Intel) or Linux (x86_64)
- At least 8GB RAM (16GB recommended for emulator)
- 10GB free disk space for SDK and emulator images
- Git installed

## Quick Start

Run the automated setup script:

```bash
bash scripts/setup-android.sh
```

The script will:

1. Check for Android Studio installation
2. Install the Android SDK command-line tools
3. Download required SDK platforms (34, 35) and build tools
4. Install Gradle build system
5. Create a Pixel 6 Pro emulator (API 34)
6. Configure environment variables
7. Create local.properties for the Flutter project

## Manual Setup

### Step 1: Install Android Studio

Download and install [Android Studio](https://developer.android.com/studio).

**macOS:**
```bash
brew install --cask android-studio
```

**Linux:**
```bash
# Download from https://developer.android.com/studio
# Extract to /usr/local/android-studio
```

Launch Android Studio and complete the setup wizard.

### Step 2: Install SDK Platforms

Using SDK Manager (Tools > SDK Manager), install:

| Package | Version |
|---------|---------|
| Android SDK Platform 34 | android-34 |
| Android SDK Platform 35 | android-35 |
| Android SDK Build-Tools | 34.0.0, 35.0.0 |
| Android SDK Platform-Tools | latest |
| Android Emulator | latest |

Or via command line:

```bash
sdkmanager "platforms;android-34" "platforms;android-35" \
           "build-tools;34.0.0" "build-tools;35.0.0" \
           "platform-tools" "emulator"
```

### Step 3: Install Gradle

**macOS:**
```bash
brew install gradle
```

**Linux:**
```bash
# Download from https://gradle.org/releases/
# Extract and add to PATH
```

### Step 4: Create Emulator

```bash
avdmanager create avd \
    -n "Pixel_6_Pro_API_34" \
    -k "system-images;android-34;google_apis;x86_64" \
    -d "pixel_6_pro"
```

### Step 5: Configure Environment

Add to shell config:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
# export ANDROID_HOME=$HOME/Android/Sdk           # Linux
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
```

### Step 6: Flutter Project Config

Create `ignition-mobile/android/local.properties`:

```properties
sdk.dir=/Users/<username>/Library/Android/sdk
```

### Step 7: Verify

```bash
flutter doctor
emulator -avd Pixel_6_Pro_API_34
cd ignition-mobile && flutter run
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| flutter doctor shows no Android SDK | Set ANDROID_HOME environment variable |
| Emulator fails to start | Enable hardware virtualization in BIOS |
| Gradle build fails | Run cd android && ./gradlew clean |
| SDK license not accepted | Run sdkmanager --licenses |
| Command line tools not found | Install cmdline-tools via SDK Manager |

## Required API Levels

- **API 34** (Android 14) -- current target
- **API 35** (Android 15) -- future target

## Resources

- [Android Studio Documentation](https://developer.android.com/studio/intro)
- [Flutter Android Setup](https://docs.flutter.dev/get-started/install)
- [Gradle User Guide](https://docs.gradle.org/current/userguide/userguide.html)
