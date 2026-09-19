# Architecture

## Product model

Vajra Setu is a **single-worker, device-local** application. Its first-run “login” screen creates a local account profile; it is onboarding, not a remote identity system. One worker record is created for that profile and every new scan is attached to it.

The interface is intentionally narrow:

```text
First run → profile setup → Home
                              ├── Scan → camera → alignment → result → saved history
                              ├── History → prior local readings
                              └── Settings → profile changes and CSV generation
```

The Home screen also provides a language picker, status explanation, wristband manual, and safety guidance as bottom sheets. These guides are informational; they do not replace site training or emergency procedures.

## Runtime layers

```text
React Native UI
  ├─ screens and reusable components
  ├─ React Navigation stacks and custom liquid-glass tab bar
  └─ translation hook
          │
          ├─ Expo Camera → JPEG capture
          ├─ image processing → RGB / CIELAB / CIEDE2000
          ├─ exposure service → category, validity, provisional estimate
          └─ Expo SQLite → profile, readings, preferences, translation cache
```

### Key files

| Area | Primary files | Responsibility |
| --- | --- | --- |
| App bootstrap | `App.tsx` | Loads fonts, initialises SQLite, provides safe-area and navigation roots. |
| Navigation | `src/navigation/RootNavigator.tsx`, `src/navigation/AppNavigator.tsx` | Routes first-run onboarding and the Home / Scan / History tabs. |
| Capture experience | `src/screens/CaptureFlowScreen.tsx`, `src/components/CameraOverlay.tsx` | Camera permission, live alignment state, capture, retry, result view. |
| Image logic | `src/services/imageProcessing.ts` | JPEG decode via native OpenCV, bounded card search, robust RGB sampling, Lab conversion, ΔE00. |
| Exposure logic | `src/services/exposure.ts`, `src/services/calibration.ts` | White balance, validity check, colour classification, interpolation, TWA calculation. |
| Persistence | `src/services/db.ts`, `src/services/csv.ts` | SQLite schema, profile/reading CRUD, cache, CSV text generation. |
| Localisation | `src/services/translation.ts`, `src/hooks/useSarvamText.ts` | Bundled copy, Sarvam request/cache fallback, rerender subscriptions. |
| Native setup | `app.json`, `plugins/withQuotedExpoConstantsPath.js` | Camera permission, iOS 27 scene support, reproducible Xcode path fix. |

## Scan data flow

```text
Camera JPEG
  → bounded indicator-card search
  → sample reference, FeSO₄, CuSO₄ regions
  → reject unreadable card / poor light
  → white-balance both pads against captured reference
  → CIEDE2000 difference from provisional fresh baselines
  → FeSO₄ validity decision
  → CuSO₄ colour category + provisional ΔE interpolation
  → persist reading, wristband, and synthetic 8-hour shift locally
```

The alignment UI calls `takePictureAsync` at low quality approximately every 1.25 seconds. It requires two readable samples before changing to **Aligned — ready to scan**; this avoids a flashing ready state when a hand moves slightly. The capture button remains disabled until this state is reached.

The final capture uses a higher-quality JPEG. Preview images are deleted after each check; the final capture URI is stored with the reading where the platform makes it available.

## Deterministic scanner, not ML

The current system uses the known physical card layout, not a trained model:

1. It searches only a bounded central part of the captured image at several offsets and scales.
2. A candidate card must have a plausible light reference and distinct colour regions.
3. It samples fixed relative rectangles/circle for the reference, sensing patch, and expiry dot.
4. It uses a trimmed mean to reduce the influence of glare, edges, and noise.

This approach is auditable and works without a training data set, but it depends on the physical card being presented in the expected orientation and layout. Printing non-reactive registration marks on future cards is the recommended upgrade for robust perspective correction.

## Local data model

SQLite is opened as `vajra_setu.db` and uses WAL mode. The main tables are:

| Table | Purpose |
| --- | --- |
| `account_profile` | The one device owner and linked worker ID. |
| `workers` | Worker records, including the local account's worker record. |
| `wristbands` | Per-capture wristband metadata. |
| `shifts` | Linked work period; scan flow currently creates an 8-hour reference shift. |
| `readings` | Validity, ΔE values, colour category, provisional estimate, risk band, and capture URI. |
| `settings` | Calibration version and non-safety display settings. |
| `translation_cache` | Persisted Sarvam text by source phrase and language. |
| `app_preferences` | Selected language and future device preferences. |

All data stays on the device unless a user explicitly exports CSV. Deleting the app or clearing its data removes local records; there is no backup or remote sync in the current implementation.

## Language and translation behaviour

The selectable languages are English (`en-IN`), Bhojpuri (`bho-IN`), Hindi (`hi-IN`), Marathi (`mr-IN`), and Kannada (`kn-IN`). Core navigation, result, manual, and safety phrases are embedded in the app so essential content stays readable without a connection.

For supported non-English languages, unbundled UI strings follow this order:

```text
bundled phrase → memory cache → SQLite cache → Sarvam Translate → English fallback
```

Bhojpuri is deliberately local-only because the implementation does not send Bhojpuri requests to Sarvam. The cache is keyed by text and target language, deduplicates concurrent requests, and warms a small set of common phrases when the language changes.

## Native constraints

- `react-native-fast-opencv` is a native module. Scanner processing is unavailable in Expo Go; use an iOS or Android development build.
- iOS uses Expo SDK 57 scene support for iOS 27. The generated scene delegate starts React Native rather than `AppDelegate` doing so directly.
- The custom Expo config plugin keeps CocoaPods/Xcode build scripts safe when the repository path contains spaces, such as `Engineering DB`.
- Generated `ios/` and `android/` directories are ignored. Recreate them with Expo prebuild; do not rely on manual edits surviving a prebuild.

## Important implementation boundaries

- The present profile flow has no remote account, password, session expiry, or server authorisation.
- CSV text can be generated, but the current app does not include a share/save implementation such as `expo-sharing`.
- `getSettings()` deliberately returns fixed H₂S reference values for safety fields rather than accepting user changes.
- The scan flow currently uses a fixed eight-hour reference period. It does not capture actual shift start/end times.
- Calibration and expiry thresholds are provisional; see [Scanner and calibration](SCANNER_AND_CALIBRATION.md).
