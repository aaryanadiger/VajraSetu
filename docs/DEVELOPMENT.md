# Development and testing guide

## Prerequisites

| Platform | Required tools |
| --- | --- |
| All | Node.js 22.x, npm, Git. |
| iOS | macOS, Xcode 26.4+, CocoaPods, and an iPhone for scanner testing. |
| Android | Android Studio, Android SDK Platform 36, platform-tools (`adb`), and a device or emulator. |

Install JavaScript dependencies from the repository root:

```bash
npm install
```

The project targets Expo SDK 57 and React Native 0.86. Use `npx expo install` for Expo-compatible package changes rather than manually selecting Expo module versions.

## Run modes

| Command | Best for | Scanner available? |
| --- | --- | --- |
| `npx expo start` | UI/navigation work in Expo Go or a browser client. | No—native OpenCV is unavailable in Expo Go. |
| `npm run ios` | Build/run a native iOS development build. | Yes, on a supported physical phone. |
| `npm run android` | Build/run a native Android development build. | Yes, on a supported physical phone/emulator with camera limitations. |
| `npm run web` | Quick layout inspection. | No camera scanning workflow. |

For an already-installed development build, launch Metro and keep it running:

```bash
npx expo start --dev-client --lan --clear
```

The phone and computer must be on the same local network. Do not close the Metro terminal while the app is open.

## iOS setup and physical-phone testing

1. Connect and unlock the iPhone, then accept the computer trust prompt.
2. In Xcode, sign in with your Apple account at **Xcode → Settings → Accounts**.
3. Run `npm run ios`, or open `ios/vajrasetuapp.xcworkspace` after prebuild.
4. Select the `vajrasetuapp` target, then **Signing & Capabilities**.
5. Enable **Automatically manage signing** and choose your Personal Team.
6. Select the connected iPhone as the run target and press Run.
7. Start Metro with the dev-client command above, then reopen the app on the phone.

A free Apple Personal Team is sufficient for local deployment to your own registered phone. The app must be re-signed periodically. TestFlight distribution requires a paid Apple Developer Program membership.

### iOS 27 support

`app.json` enables `expo-build-properties` with `ios.enableSceneSupport: true`. This generates Expo's scene manifest and `EXExpoAppSceneDelegate`, which prevents the iOS 27 launch crash caused by missing scene lifecycle adoption. Keep this setting when using Expo SDK 57.

### Repository paths containing spaces

The repository currently sits in a path that contains a space (`Engineering DB`). The custom plugin at `plugins/withQuotedExpoConstantsPath.js` persists two Xcode/CocoaPods quoting fixes across Expo prebuilds. Do not delete this plugin or remove it from `app.json` unless the generated build scripts are no longer affected and the change is verified on a clean prebuild.

### “No script URL provided” on the phone

This means the native development build launched but Metro was not reachable.

1. From the project root run:

   ```bash
   npx expo start --dev-client --lan --clear
   ```

2. Keep the terminal open.
3. Put the phone and Mac on the same Wi-Fi and disable VPN/hotspot client isolation temporarily.
4. Close the app fully, reopen it, then press Reload if prompted.

If a LAN connection is impossible, a tunnel can be used only after considering that it exposes the development bundle to third-party relay infrastructure.

### Native build reset

When native configuration changes, regenerate before building:

```bash
npx expo prebuild --platform ios --clean
cd ios
pod install
cd ..
npm run ios
```

`ios/` is generated and ignored by git. Reapply the Personal Team selection after a clean prebuild because Xcode signing configuration may be regenerated.

## Android setup

Install Android Studio, then use **SDK Manager** to install:

- Android SDK Platform 36
- Android SDK Build-Tools
- Android SDK Platform-Tools (includes `adb`)
- Android Emulator if an emulator is required

Set `ANDROID_HOME` to the SDK location and add `platform-tools` to `PATH`. On Windows, the usual default SDK location is `%LOCALAPPDATA%\\Android\\Sdk`, but use the actual location shown by Android Studio if it differs.

Verify that `adb` is available:

```bash
adb version
adb devices
```

Then enable Developer Options and USB debugging on the device, connect it, accept the RSA prompt, and run:

```bash
npm run android
```

If Expo reports that it cannot resolve the Android SDK path or cannot find `adb`, fix the environment variable/PATH first; the error occurs before the app is built.

## Configuration and secrets

Create a local `.env` only if remote fallback translation is needed:

```dotenv
EXPO_PUBLIC_SARVAM_API_KEY=your_sarvam_api_key
```

`.env` is ignored by git. `EXPO_PUBLIC_*` environment values are bundled into the client and can be recovered from an app build. Use a short-lived restricted key only for local prototyping; production translation must use an authenticated backend/proxy with rate limits, usage monitoring, and secret storage.

## Checks before sharing a build

Run these from the repository root:

```bash
npx tsc --noEmit
npx expo export --platform ios --output-dir /tmp/vajrasetu-ios-export
npx expo export --platform android --output-dir /tmp/vajrasetu-android-export
```

The export check validates JavaScript bundling. It does not prove camera or native OpenCV behaviour; complete the manual checklist below on a physical device.

## Manual acceptance checklist

### First run and account

- Fresh install opens profile setup rather than the main tabs.
- Empty name, worker ID, or site shows validation feedback.
- Valid profile enters Home and shows initials in the account badge.
- Editing the profile in Settings updates the Home greeting.

### Language and low-connectivity use

- Switch through English, Bhojpuri, Hindi, Marathi, and Kannada.
- Confirm labels and safety guidance stay readable in airplane mode.
- With the Sarvam key present, switch to Hindi/Marathi/Kannada and return to a page to confirm cached text appears without repeated waits.
- Confirm a missing/bad key falls back to bundled English rather than blocking the page.

### Scanner

- Camera permission prompt explains the use and allows entering the camera.
- Empty/cropped frame never enables capture.
- Correctly aligned card shows the ready confirmation after stable previews.
- Glare/shadow prompts for even light.
- Torch switches visibly and can be switched off.
- A valid-looking test card reaches a result and History records it.
- An invalid/aged test control reaches the replacement flow.
- Expo Go displays the development-build requirement rather than a simulated result.

### Data

- Relaunch the app and confirm profile/history remain.
- Confirm a new scan appears in History with a timestamp and risk label.
- With no readings, export shows the “No Data” message.
- Record that CSV generation is present but device sharing/saving is not implemented yet.

## Troubleshooting table

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| App closes immediately on iOS 27 | Build predates scene support. | Reinstall after the current `app.json` prebuild; see iOS 27 support above. |
| `No script URL provided` | Metro is stopped or unreachable. | Start `npx expo start --dev-client --lan --clear`; keep it open and check Wi-Fi/VPN. |
| Scanner says to use development build | App is running in Expo Go. | Install with `npm run ios` or `npm run android`. |
| iOS build says `Engineering: No such file or directory` | An unquoted native path with a space. | Keep the custom config plugin enabled, run clean prebuild and `pod install`. |
| iOS build needs a development team | Native project has no signing team after prebuild. | Choose Personal Team in Xcode Signing & Capabilities. |
| Android cannot find `adb` | Platform-tools missing from PATH. | Install Platform-Tools, configure `ANDROID_HOME` and PATH, then reopen the terminal. |
| Card never aligns | Card is outside guide, tilted, incomplete, or lighting is poor. | Centre only the card, reduce glare, use diffuse light, and hold steady. |

## Test strategy gap

There is no automated test suite in the repository yet. Before changing scanner or safety logic, add unit tests for colour conversion, ΔE00 reference vectors, calibration interpolation, validity thresholds, risk/category boundaries, and translation caching. Add device-level manual test evidence for every supported phone model and calibration version.
