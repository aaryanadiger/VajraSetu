#!/usr/bin/env bash
# Run on macOS after Expo prebuild and pod install. Sign locally with xtool.
set -euo pipefail

cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'This build step needs macOS/Xcode. Use the Build iPhone IPA GitHub workflow.' >&2
  exit 1
fi

output="$PWD/build/iphone"
mkdir -p "$output"
shopt -s nullglob
workspaces=(ios/*.xcworkspace)
if [[ ${#workspaces[@]} -ne 1 ]]; then
  echo 'Expected one generated iOS workspace. Run Expo prebuild and pod install first.' >&2
  exit 1
fi
workspace="${workspaces[0]}"
scheme="$(basename "$workspace" .xcworkspace)"

# Release embeds JavaScript/assets and does not require Metro on the phone.
xcodebuild \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$output/DerivedData" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  build 2>&1 | tee "$output/xcodebuild.log"

apps=("$output"/DerivedData/Build/Products/Release-iphoneos/*.app)
if [[ ${#apps[@]} -ne 1 ]]; then
  echo 'Expected exactly one compiled device app.' >&2
  exit 1
fi
app="${apps[0]}"
if [[ ! -s "$app/main.jsbundle" ]]; then
  echo 'Release JavaScript bundle is missing; refusing to package an app that needs Metro.' >&2
  exit 1
fi

# A fresh staging directory prevents old Payload entries leaking into a rebuild.
staging="$(mktemp -d "$output/package.XXXXXX")"
trap 'rm -rf -- "$staging"' EXIT
mkdir "$staging/Payload"
ditto "$app" "$staging/Payload/$(basename "$app")"
ditto -c -k --keepParent "$staging/Payload" "$output/VajraSetu-unsigned.ipa"

{
  echo "Commit: $(git rev-parse HEAD)"
  echo "Built UTC: $(date -u +%FT%TZ)"
  xcodebuild -version
  echo "iOS SDK: $(xcrun --sdk iphoneos --show-sdk-version)"
  echo "Bundle ID: $(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$app/Info.plist")"
  echo "Minimum iOS: $(/usr/libexec/PlistBuddy -c 'Print MinimumOSVersion' "$app/Info.plist")"
  echo "IPA SHA-256: $(shasum -a 256 "$output/VajraSetu-unsigned.ipa")"
  echo 'Unsigned device build: sign/install locally with xtool; not a TestFlight upload.'
} > "$output/build-info.txt"
cat "$output/build-info.txt"
