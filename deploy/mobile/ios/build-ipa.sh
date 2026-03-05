#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# GRPO Mobile — iOS IPA Build Script
#
# Builds a signed IPA for distribution via TestFlight or direct install.
#
# Prerequisites:
#   - macOS with Xcode 15+
#   - Apple Developer Account (Team ID)
#   - Provisioning Profile installed
#   - CocoaPods
#   - Node.js 20 LTS
#
# Signing:
#   Set environment variables:
#     APPLE_TEAM_ID         - e.g., "ABC1234567"
#     PROVISIONING_PROFILE  - Profile name
#     CODE_SIGN_IDENTITY    - e.g., "iPhone Distribution: UNIMED (ABC1234567)"
# ═══════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  GRPO Mobile — iOS IPA Builder                          ║"
echo "║  Medical Device Receiving Module                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Configuration ─────────────────────────────────────────────────
APP_NAME="GRPO Receiving"
BUNDLE_ID="com.unimed.grpo"
VERSION="1.0.0"
BUILD_NUMBER="1"
DEPLOYMENT_TARGET="16.0"
SCHEME="GRPOReceiving"
WORKSPACE="ios/GRPOReceiving.xcworkspace"

# ── Verify Environment ───────────────────────────────────────────
echo "🔍 Checking build environment..."

if [[ "$(uname)" != "Darwin" ]]; then
    echo "❌ iOS builds require macOS. Current OS: $(uname)"
    echo "   Use a Mac or a macOS CI runner (GitHub Actions, Bitrise, etc.)"
    exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode not found. Install from the Mac App Store."
    exit 1
fi
echo "  ✅ Xcode: $(xcodebuild -version | head -1)"

if ! command -v pod &> /dev/null; then
    echo "⚠️  CocoaPods not found. Installing..."
    sudo gem install cocoapods
fi
echo "  ✅ CocoaPods: $(pod --version)"

if ! command -v npx &> /dev/null; then
    echo "❌ Node.js not found."
    exit 1
fi
echo "  ✅ Node: $(node --version)"
echo ""

# ── Validate Signing ─────────────────────────────────────────────
if [ -z "$APPLE_TEAM_ID" ]; then
    echo "⚠️  APPLE_TEAM_ID not set. Using automatic signing."
    echo "   For distribution, set: APPLE_TEAM_ID, PROVISIONING_PROFILE, CODE_SIGN_IDENTITY"
    echo ""
    SIGNING_STYLE="automatic"
else
    SIGNING_STYLE="manual"
    echo "  ✅ Team ID: $APPLE_TEAM_ID"
fi

# ── Build Config ─────────────────────────────────────────────────
echo "📋 Build Configuration:"
echo "   App Name:     $APP_NAME"
echo "   Bundle ID:    $BUNDLE_ID"
echo "   Version:      $VERSION ($BUILD_NUMBER)"
echo "   Target:       iOS $DEPLOYMENT_TARGET+"
echo "   Signing:      $SIGNING_STYLE"
echo ""

# ── Install Dependencies ─────────────────────────────────────────
echo "📦 Installing Node dependencies..."
npm ci --production
echo ""

echo "📦 Installing CocoaPods..."
cd ios
pod install --repo-update
cd ..
echo ""

# ── Build JavaScript Bundle ──────────────────────────────────────
echo "📜 Building React Native bundle..."
npx react-native bundle \
    --platform ios \
    --dev false \
    --entry-file index.js \
    --bundle-output ios/main.jsbundle \
    --assets-dest ios/
echo ""

# ── Archive ──────────────────────────────────────────────────────
ARCHIVE_PATH="build/GRPOReceiving.xcarchive"
EXPORT_PATH="build/ipa"

echo "🔨 Archiving..."
xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    IPHONEOS_DEPLOYMENT_TARGET="$DEPLOYMENT_TARGET" \
    MARKETING_VERSION="$VERSION" \
    CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
    ${APPLE_TEAM_ID:+DEVELOPMENT_TEAM="$APPLE_TEAM_ID"} \
    ${CODE_SIGN_IDENTITY:+CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY"} \
    CODE_SIGN_STYLE="$SIGNING_STYLE" \
    | xcpretty || true
echo ""

# ── Export IPA ───────────────────────────────────────────────────
echo "📦 Exporting IPA..."

# Create ExportOptions plist
cat > build/ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>ad-hoc</string>
    <key>teamID</key>
    <string>${APPLE_TEAM_ID:-AUTO}</string>
    <key>compileBitcode</key>
    <false/>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>thinning</key>
    <string>&lt;none&gt;</string>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist build/ExportOptions.plist \
    -exportPath "$EXPORT_PATH" \
    | xcpretty || true

# ── Output ───────────────────────────────────────────────────────
IPA_PATH="$EXPORT_PATH/GRPOReceiving.ipa"
if [ -f "$IPA_PATH" ]; then
    SIZE=$(du -h "$IPA_PATH" | cut -f1)
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  ✅ IPA Build Successful                                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "   📱 IPA:  $IPA_PATH"
    echo "   📦 Size: $SIZE"
    echo ""
    echo "   Distribution Options:"
    echo "   • TestFlight: xcrun altool --upload-app -f $IPA_PATH"
    echo "   • Ad-Hoc:     Install via Apple Configurator or MDM"
    echo "   • Enterprise: Distribute via your MDM solution"
else
    echo "❌ Build failed. Check Xcode output above."
    echo ""
    echo "   Common fixes:"
    echo "   • Set APPLE_TEAM_ID environment variable"
    echo "   • Install provisioning profile in Xcode"
    echo "   • Run: open $WORKSPACE (fix signing in Xcode UI)"
    exit 1
fi
