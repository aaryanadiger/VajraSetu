# Vajra Setu

Vajra Setu is a worker-first mobile prototype for recording an H₂S wristband check. A worker aligns a small indicator card in the phone camera, the app reads the CuSO₄ sensing patch and FeSO₄ validity dot on-device, and the result is saved locally with the worker's profile.

It is designed to be simple in a factory setting: one device belongs to one worker, the home screen has one main action—**Scan wristband**—and all critical status is expressed with a label and colour together.

> **Prototype safety boundary:** the current calibration curve, fresh-colour baselines, validity threshold, and ppm estimates are placeholders. The application is not a real-time gas detector, does not measure instantaneous peaks, and must not be used to establish legal compliance or make an emergency decision. Follow the site's gas-monitor, emergency, PPE, and supervision procedures.

## What is implemented

- Device-local profile onboarding: name, worker ID, and site/factory.
- Home, Scan, History, and Settings flows with an account badge and bottom navigation.
- Camera permission, live alignment feedback, torch control, three-frame capture consistency checks, retry guidance, and result storage.
- Deterministic on-device image processing—no ML training set or cloud image upload is required.
- FeSO₄ band-validity gate; CuSO₄ rule-based colour category (`low`, `elevated`, or `high`).
- A provisional ΔE → cumulative ppm·hr → 8-hour TWA pipeline with image-quality and saturation metadata.
- English, Bhojpuri, Hindi, Marathi, and Kannada UI support. Common safety copy is packaged offline; supported cache misses can use Sarvam Translate and are persisted locally.
- Local Expo SQLite storage and CSV generation.
- iOS 27 scene lifecycle support and a config plugin for workspaces whose path contains spaces.

## Documentation

| Document | Use it for |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | App structure, navigation, data model, and processing flow. |
| [Scanner and calibration](docs/SCANNER_AND_CALIBRATION.md) | How scanning works without ML, test protocol, calibration requirements, and limits. |
| [Development guide](docs/DEVELOPMENT.md) | First-time setup, native builds, device testing, troubleshooting, and verification. |
| [Safety and operating guide](docs/OPERATIONS_AND_SAFETY.md) | Worker workflow, interpretation boundary, data handling, and production readiness checklist. |

## Quick start

### Requirements

- Node.js 22.x and npm
- Xcode 26.4+ for iOS builds, or Android Studio with Android SDK 36 for Android builds
- A physical phone for the real scanner—Expo Go cannot load `react-native-fast-opencv`

```bash
npm install
npx expo start
```

The standard Expo server is useful for UI work. To use the scanner, install a native development build:

```bash
npx expo run:ios
# or
npx expo run:android
```

For a development build already installed on a phone, start Metro and leave it running:

```bash
npx expo start --dev-client --lan --clear
```

The phone and computer must be on the same Wi-Fi network. See the [development guide](docs/DEVELOPMENT.md) for iOS signing, Android SDK setup, and the “No script URL provided” fix.

## Configuration

Copy the following into a local `.env` file only when Sarvam fallback translations are needed:

```dotenv
EXPO_PUBLIC_SARVAM_API_KEY=your_sarvam_api_key
```

`EXPO_PUBLIC_*` values are included in a client build. Do **not** treat this key as secret in a production release; move translation requests behind an authenticated backend or proxy before release. Offline bundled copy remains available when no key or network is available.

## Project layout

```text
App.tsx                         App bootstrap: fonts, SQLite initialisation, navigation
src/screens/                    Worker-facing screens and scan flow
src/services/imageProcessing.ts RGB/Lab/ΔE00 math and deterministic region extraction
src/services/exposure.ts        Validity gate, colour category, TWA and risk result
src/services/calibration.ts     Calibration-curve loader and interpolation
src/services/db.ts              SQLite schema and data access
src/services/translation.ts     Local copy, Sarvam fallback, and cache orchestration
calibration/h2s_curve_v1.json   Provisional calibration asset—replace after lab work
plugins/                        Persistent native build fixes for Expo prebuild
docs/                           Product, safety, scanner, and development documentation
```

## Current status

This repository intentionally treats camera alignment and colour categorisation as a prototype feature. Before a pilot or field deployment, complete the calibration and validation gates in [Scanner and calibration](docs/SCANNER_AND_CALIBRATION.md), secure translation credentials, add automated tests, and complete an EHS/legal review for the intended state and facility.

## Verification

```bash
npx tsc --noEmit
npx expo export --platform ios --output-dir /tmp/vajrasetu-ios-export
```

There is currently no automated test suite. The required manual device checks are listed in the [development guide](docs/DEVELOPMENT.md).

## License

See [LICENSE](LICENSE).
