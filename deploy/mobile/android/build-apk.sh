#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# GRPO Mobile — Android APK Build Script
#
# Builds a signed release APK for distribution to warehouse operators.
#
# Prerequisites:
#   - Android SDK (API 33+)
#   - Java 17 JDK
#   - Node.js 20 LTS
#   - React Native CLI (or Expo)
#
# Signing:
#   Store your keystore at: android/app/grpo-release.keystore
#   Set environment variables:
#     GRPO_KEYSTORE_PASSWORD
#     GRPO_KEY_ALIAS
#     GRPO_KEY_PASSWORD
# ═══════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  GRPO Mobile — Android APK Builder                      ║"
echo "║  Medical Device Receiving Module                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Configuration ─────────────────────────────────────────────────
APP_NAME="GRPO Receiving"
PACKAGE_NAME="com.unimed.grpo"
VERSION_NAME="1.0.0"
VERSION_CODE="1"
MIN_SDK="26"          # Android 8.0
TARGET_SDK="34"       # Android 14
BUILD_TYPE="release"

# ── Verify Environment ───────────────────────────────────────────
echo "🔍 Checking build environment..."

if ! command -v java &> /dev/null; then
    echo "❌ Java JDK not found. Install JDK 17:"
    echo "   https://adoptium.net/temurin/releases/"
    exit 1
fi
echo "  ✅ Java: $(java --version 2>&1 | head -1)"

if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME not set. Install Android SDK:"
    echo "   https://developer.android.com/studio"
    exit 1
fi
echo "  ✅ Android SDK: $ANDROID_HOME"

if ! command -v npx &> /dev/null; then
    echo "❌ Node.js not found."
    exit 1
fi
echo "  ✅ Node: $(node --version)"
echo ""

# ── Keystore Check ───────────────────────────────────────────────
KEYSTORE_PATH="android/app/grpo-release.keystore"
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "⚠️  Keystore not found. Generating a debug keystore..."
    echo "   For production, replace with your release keystore."
    echo ""
    keytool -genkeypair \
        -v \
        -storetype PKCS12 \
        -keystore "$KEYSTORE_PATH" \
        -alias grpo-key \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass grpo-debug-password \
        -keypass grpo-debug-password \
        -dname "CN=GRPO Module, OU=Medical Devices, O=UNIMED, L=Riyadh, ST=Riyadh, C=SA"
    
    export GRPO_KEYSTORE_PASSWORD="grpo-debug-password"
    export GRPO_KEY_ALIAS="grpo-key"
    export GRPO_KEY_PASSWORD="grpo-debug-password"
fi

# ── Build Config ─────────────────────────────────────────────────
echo "📋 Build Configuration:"
echo "   App Name:     $APP_NAME"
echo "   Package:      $PACKAGE_NAME"
echo "   Version:      $VERSION_NAME ($VERSION_CODE)"
echo "   Min SDK:      $MIN_SDK (Android 8.0)"
echo "   Target SDK:   $TARGET_SDK (Android 14)"
echo ""

# ── Install Dependencies ─────────────────────────────────────────
echo "📦 Installing dependencies..."
npm ci --production
echo ""

# ── Build JavaScript Bundle ──────────────────────────────────────
echo "📜 Building React Native bundle..."
npx react-native bundle \
    --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res/
echo ""

# ── Gradle Build ─────────────────────────────────────────────────
echo "🔨 Building APK..."
cd android
./gradlew assembleRelease \
    -PGRPO_KEYSTORE_PASSWORD="${GRPO_KEYSTORE_PASSWORD}" \
    -PGRPO_KEY_ALIAS="${GRPO_KEY_ALIAS}" \
    -PGRPO_KEY_PASSWORD="${GRPO_KEY_PASSWORD}"
cd ..

# ── Output ───────────────────────────────────────────────────────
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  ✅ APK Build Successful                                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "   📱 APK:  $APK_PATH"
    echo "   📦 Size: $SIZE"
    echo ""
    echo "   Distribution:"
    echo "   • Transfer to devices via MDM, USB, or email"
    echo "   • Enable 'Install from Unknown Sources' on device"
    echo "   • Install and enter GRPO Service URL on first launch"
else
    echo "❌ Build failed. Check Gradle output above."
    exit 1
fi
