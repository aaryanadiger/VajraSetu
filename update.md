# VajraSetu (Vajra सेतु) — Repository & Architecture Summary

**Document Version:** 1.0.0  
**Generated Date:** September 11, 2026  
**Repository:** `VajraSetu` (`aaryanadiger/VajraSetu`)  
**Target File:** `update.md` (Root)

---

## 1. Executive Summary

**VajraSetu (Vajra सेतु)** is an edge-computing occupational health and chemical exposure monitoring platform developed for sanitation, municipal drainage, sewer, and industrial workers. It pairs **ultra-low-cost, passive wearable colorimetric wristbands** with **on-device mobile computer vision** to detect and quantify cumulative exposure to toxic **Hydrogen Sulfide ($H_2S$)** gas.

The application executes the entire colorimetric and dosimetry pipeline directly on the smartphone without requiring an internet connection or cloud processing. It linearizes camera sRGB inputs, converts them to the perceptual **CIELAB** color space under standard illuminant D65, computes the advanced **CIEDE2000 ($\Delta E_{00}$)** color difference metric, gates readings via an ambient-degradation expiry dot, and maps color shifts through piecewise-linear calibration curves into Time-Weighted Average (**TWA**) concentrations and **$H_2S$ Exposure Hazard Indices** based on occupational epidemiology models.

All data is stored locally in an **Expo SQLite** database configured with Write-Ahead Logging (WAL) and can be exported as standard CSV reports for Occupational Health & Safety (OHS) statutory compliance.

---

## 2. Problem Statement & Domain Context

### 2.1 The Invisible Danger of Hydrogen Sulfide ($H_2S$)
Hydrogen Sulfide is a colorless, acutely neurotoxic, and respiratory-paralyzing gas prevalent in sewers, manholes, wastewater treatment plants, and petrochemical sites:
* **0.01 – 1.5 ppm**: Olfactory perception threshold (characteristic "rotten egg" odor).
* **2.0 – 5.0 ppm**: Eye irritation, headache, nausea, bronchial constriction.
* **10.0 ppm**: 8-hour Time-Weighted Average reference in the Second Schedule of the India Factories Act, 1948.
* **15.0 ppm**: 15-minute Short-Term Exposure Limit reference in the Second Schedule of the India Factories Act, 1948.
* **20.0 – 50.0 ppm**: Rapid olfactory nerve paralysis. Workers lose their sense of smell within minutes, creating a lethal illusion of safety.
* **100.0+ ppm**: Immediately Dangerous to Life or Health (IDLH); pulmonary edema, acute chemical asphyxiation, instant collapse, and fatalities.

### 2.2 The Technological & Economic Gap
Traditional active electronic photoionization or electrochemical multi-gas detectors cost hundreds of dollars per unit, require constant battery charging, and demand regular bench sensor recalibration. Consequently, municipal sanitation authorities and contractors in developing nations rarely equip frontline manual scavengers or drainage workers with personal monitors. 

VajraSetu replaces expensive hardware with **sub-dollar passive chemical wristband strips**, digitizing them through supervisors' or workers' existing smartphones at the end of each shift or entry cycle.

---

## 3. Chemical Sensing & Physical Dosimeter Design

The physical dosimeter strip worn on the worker's wrist comprises three distinct optical zones:

```
+-------------------------------------------------------------+
|   [ Printed White ]    [ CuSO4 + Glycerol ]    [ FeSO4 ]    |
|   [Reference Patch]    [ Reactive Matrix  ]    [Expiry]     |
+-------------------------------------------------------------+
```

### 3.1 Reactive Sensing Matrix ($CuSO_4$ + Glycerol + $H_2O$)
* **Reagent:** Copper(II) Sulfate embedded in a hydro-absorbent glycerol matrix.
* **Chemical Reaction:**
  $$\text{CuSO}_4 (aq) + \text{H}_2\text{S} (g) \longrightarrow \text{CuS} (s)\ [\text{Dark Brown / Black}] + \text{H}_2\text{SO}_4 (aq)$$
* **Optical Mechanism:** As gaseous $H_2S$ diffuses into the hydrogel, insoluble Copper(II) Sulfide precipitates. The optical density and color shift of the patch transition from light blue/tan to dark brown/black proportional to the cumulative exposure dose (concentration $\times$ time, expressed in $\text{ppm}\cdot\text{hr}$).

### 3.2 Oxidation & Shelf-Life Expiry Dot ($FeSO_4$)
* **Reagent:** Iron(II) Sulfate indicator dot.
* **Chemical Reaction:**
  $$4 \text{FeSO}_4 + \text{O}_2 + 2 \text{H}_2\text{O} \longrightarrow 4 \text{Fe(OH)SO}_4$$
* **Quality Gate:** Monitors atmospheric oxidation, humidity breakdown, or expired shelf-life prior to deployment. If the color difference ($\Delta E$) of this patch relative to the unexposed baseline exceeds calibrated bounds ($\Delta E > 8$), the software flags the band as `INVALID_BAND`, rejecting the scan and preventing false-safe readings.

### 3.3 Printed Neutral Reference Scale
* An inert white target printed directly on the substrate enables the computer vision pipeline to compute chromatic white-point offsets, normalizing for disparate field conditions (shadows, direct sunlight, color temperature shifts, and varying mobile camera sensors).

---

## 4. Computer Vision & Colorimetric Engine

The colorimetry pipeline (`src/services/imageProcessing.ts`) runs on-device in pure TypeScript for deterministic numerical precision across devices. It uses the indicator card's fixed layout rather than a trained ML model: a bounded in-guide search identifies the neutral reference and the two colour pads, then the pads are sampled deterministically. An OpenCV bridge decodes the capture; printed non-reactive registration marks are the planned production upgrade for automatic perspective correction.

### 4.1 sRGB to CIE $L^*a^*b^*$ Pipeline
Digital camera sensors produce non-linear, device-dependent sRGB values ($0 - 255$). The engine transforms these into the perceptually uniform CIELAB color space under standard illuminant D65 ($X_n = 0.95047, Y_n = 1.00000, Z_n = 1.08883$):

1. **sRGB Linearization:**
   $$C_{\text{linear}} = \begin{cases} \dfrac{C_{\text{srgb}}}{12.92}, & \text{if } C_{\text{srgb}} \le 0.04045 \\ \left(\dfrac{C_{\text{srgb}} + 0.055}{1.055}\right)^{2.4}, & \text{if } C_{\text{srgb}} > 0.04045 \end{cases}$$

2. **Linear RGB to CIE 1931 XYZ (D65 Illuminant):**
   $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix} 0.4124564 & 0.3575761 & 0.1804375 \\ 0.2126729 & 0.7151522 & 0.0721750 \\ 0.0193339 & 0.1191920 & 0.9503041 \end{bmatrix} \begin{bmatrix} R_{\text{lin}} \\ G_{\text{lin}} \\ B_{\text{lin}} \end{bmatrix}$$

3. **XYZ to CIELAB ($L^*, a^*, b^*$):**
   $$f(t) = \begin{cases} t^{1/3}, & \text{if } t > 0.008856 \\ 7.787 t + \dfrac{16}{116}, & \text{if } t \le 0.008856 \end{cases}$$
   $$L^* = 116 f(Y / Y_n) - 16, \quad a^* = 500 [f(X / X_n) - f(Y / Y_n)], \quad b^* = 200 [f(Y / Y_n) - f(Z / Z_n)]$$

### 4.2 CIEDE2000 ($\Delta E_{00}$) Metric
Rather than relying on non-uniform Euclidean distances ($\Delta E^*_{ab}$), the system implements the full **CIEDE2000** standard (Sharma et al., 2005) to compute perceptual distance between target patches and the printed reference:
$$\Delta E_{00} = \sqrt{\left(\frac{\Delta L'}{k_L S_L}\right)^2 + \left(\frac{\Delta C'}{k_C S_C}\right)^2 + \left(\frac{\Delta H'}{k_H S_H}\right)^2 + R_T \left(\frac{\Delta C'}{k_C S_C}\right) \left(\frac{\Delta H'}{k_H S_H}\right)}$$
Incorporates chroma weighting ($G$), hue-rotation interaction ($R_T$), and lightness/chroma/hue positional weighting ($S_L, S_C, S_H$).

### 4.3 Calibration Curve & Piecewise Linear Interpolation
* The sensing patch $\Delta E$ is evaluated against empirical calibration tables (`calibration/h2s_curve_v1.json`).
* Between control points, piecewise linear interpolation maps $\Delta E \longrightarrow \text{Cumulative ppm}\cdot\text{hr}$.
* If $\Delta E \ge 55$, the dosimeter is flagged as **saturated** (overexposure exceeding linear optical density).

---

## 5. Dosimetry & Exposure Hazard Mathematics

Implemented in `src/services/exposure.ts`:

### 5.1 Shift Time-Weighted Average (TWA)
$$\text{TWA (ppm)} = \frac{\text{Cumulative Exposure (ppm}\cdot\text{hr)}}{\text{Shift Duration (hours)}}$$

### 5.2 Single-Sample $H_2S$ Exposure Index
Adapted from occupational epidemiology models (**Austigard & Smedbold 2022**, *Annals of Work Exposures and Health*):
* Since passive strips capture cumulative exposure rather than continuous time series, peak exposure is conservatively estimated:
  $$\text{maxPpmEstimate} = \text{TWA} \times 2.0$$
* The shift duration is assigned to concentration tiers ($H_2S01 \le 1\text{ ppm}$, $H_2S1 \le 5\text{ ppm}$, $H_2S5 \le 10\text{ ppm}$, $H_2S10 > 10\text{ ppm}$), combined with the peak factor, and normalized to a $0 - 100$ index.
* Tagged as `index_mode: 'estimated_single_sample'`.

### 5.3 Risk Stratification Matrix

| Risk Classification | TWA Threshold (ppm) | $H_2S$ Index | Action Protocol |
| :--- | :--- | :--- | :--- |
| **Low Exposure** | $< 2.5\text{ ppm}$ | $< 10.0$ | Normal parameters; shift sign-off approved. |
| **Elevated** | $2.5 - 5.0\text{ ppm}$ | $10.0 - 25.0$ | Advisory notice; ventilation and equipment review. |
| **High Risk** | $> 5.0\text{ ppm}$ | $> 25.0$ | Statutory OEL breach; medical evaluation and incident log. |
| **Invalid** | Expiry dot out of bounds | N/A | Band corrupted/expired; reject reading and rescan. |

*Statutory reference values follow the **India Factories Act (1948), Second Schedule** (10 ppm TWA, 15 ppm STEL). State factory rules and the site’s approved emergency procedure also apply.*

---

## 6. System Architecture & Technical Stack

```
+-------------------------------------------------------------------------+
|                              PHYSICAL LAYER                             |
|          Wearable Wristband Strip (CuSO4 + Glycerol + FeSO4 Dot)        |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                             ACQUISITION                                 |
|       expo-camera (CameraView) with Viewfinder Alignment Overlay        |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                      EDGE COMPUTER VISION PIPELINE                      |
|   1. ROI Extraction (react-native-fast-opencv with Expo Go fallback)    |
|   2. sRGB -> CIE XYZ (D65) -> CIELAB Conversion                         |
|   3. CIEDE2000 (ΔE00) Difference vs Reference White                     |
|   4. FeSO4 Shelf-Life & Expiry Validation Gate                          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                           DOSIMETRY ENGINE                              |
|   1. Piecewise Linear Interpolation (calibration/h2s_curve_v1.json)     |
|   2. Time-Weighted Average (TWA ppm) Computation                        |
|   3. Austigard & Smedbold (2022) H2S Index Estimation                   |
|   4. OEL Risk Classification (Low, Elevated, High Risk)                 |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                        LOCAL PERSISTENCE & AUDIT                        |
|   1. Expo SQLite Engine (WAL Mode, Local-Only vajra_setu.db)           |
|   2. Workers, Shifts, Wristbands, and Quantitative Readings             |
|   3. OHS Compliance CSV Generation & System Share Sheet                 |
+-------------------------------------------------------------------------+
```

### Core Technologies
* **Framework:** React Native `0.86.3` with Expo `~57.0.21` (React `19.2.3`, TypeScript `~6.0.3`).
* **Navigation:** `@react-navigation/native` v7, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`.
* **Database:** `expo-sqlite` (`^57.0.2`) with Write-Ahead Logging (`PRAGMA journal_mode = WAL`).
* **Camera:** `expo-camera` (`~57.0.4`) with camera permissions handling.
* **Vector Graphics:** `react-native-svg` (`15.15.4`) powering custom tab bar icons and data visualization.
* **Typography & Fonts:** `expo-font`, `@expo-google-fonts/dm-sans`, and `@expo-google-fonts/crimson-text`.
* **Computer Vision Bridge:** `react-native-fast-opencv` (`^1.0.1`) with pure TypeScript simulation fallback for Expo Go.

---

## 7. Database Schema & Data Models

Managed in `src/services/db.ts` (`vajra_setu.db`):

```sql
-- Worker Profiles
CREATE TABLE IF NOT EXISTS workers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  worker_code TEXT NOT NULL UNIQUE,
  site_id     TEXT NOT NULL DEFAULT 'DEFAULT_SITE',
  created_at  TEXT NOT NULL
);

-- Wristband Issuance Records
CREATE TABLE IF NOT EXISTS wristbands (
  id                          TEXT PRIMARY KEY,
  batch_id                    TEXT NOT NULL,
  issued_at                   TEXT NOT NULL,
  expiry_calibration_version  TEXT NOT NULL DEFAULT 'v1'
);

-- Shift Logs
CREATE TABLE IF NOT EXISTS shifts (
  id           TEXT PRIMARY KEY,
  worker_id    TEXT NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT,
  wristband_id TEXT NOT NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (wristband_id) REFERENCES wristbands(id)
);

-- Quantitative Colorimetric & Exposure Readings
CREATE TABLE IF NOT EXISTS readings (
  id                          TEXT PRIMARY KEY,
  shift_id                    TEXT NOT NULL,
  wristband_id                TEXT NOT NULL,
  captured_at                 TEXT NOT NULL,
  band_valid                  INTEGER NOT NULL DEFAULT 0,
  expiry_delta_e              REAL NOT NULL DEFAULT 0,
  sensing_delta_e             REAL NOT NULL DEFAULT 0,
  cumulative_ppm_hr           REAL NOT NULL DEFAULT 0,
  twa_ppm                     REAL NOT NULL DEFAULT 0,
  h2s_index                   REAL NOT NULL DEFAULT 0,
  index_mode                  TEXT NOT NULL DEFAULT 'estimated_single_sample',
  risk_band                   TEXT NOT NULL DEFAULT 'invalid',
  calibration_curve_version   TEXT NOT NULL DEFAULT 'v1',
  raw_image_path              TEXT,
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  FOREIGN KEY (wristband_id) REFERENCES wristbands(id)
);

-- System Configurations & OEL Thresholds
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Supervisor Authentication
CREATE TABLE IF NOT EXISTS auth (
  id        INTEGER PRIMARY KEY DEFAULT 1,
  pin_hash  TEXT
);
```

---

## 8. Directory & File Inventory

```
VajraSetu/
├── assets/                          # Application icons, splash screens, and Android adaptive icons
├── calibration/
│   └── h2s_curve_v1.json            # Piecewise ΔE to ppm·hr points, expiry bounds, and saturation limit
├── preview/
│   └── index.html                   # Interactive browser-based phone mockup demonstrating UI & styling
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── AppHeader.tsx        # Top navigation header with logo and status indicators
│   │   │   ├── Badge.tsx            # Semantic status badges (success, warning, danger, neutral)
│   │   │   ├── Button.tsx           # Primary and outline themed action buttons
│   │   │   ├── Card.tsx             # Standard elevation surface card container
│   │   │   └── Input.tsx            # Form input field with validation styling
│   │   ├── CameraOverlay.tsx        # High-contrast alignment reticle for dosimeter framing
│   │   ├── CleanBottomTabBar.tsx    # SVG-based custom curved bottom navigation bar
│   │   ├── ExposureGauge.tsx        # Exposure readout displaying value and progress
│   │   ├── SegmentedBar.tsx         # 50-segment gradient bar reflecting cumulative exposure
│   │   └── WorkerListItem.tsx       # Roster list item displaying avatar, name, code, and latest risk
│   ├── navigation/
│   │   ├── AppNavigator.tsx         # Main bottom tab navigator (Home, Scan, History) and sub-stacks
│   │   └── RootNavigator.tsx        # Authentication gate (Login vs Main App) with AuthContext
│   ├── screens/
│   │   ├── CaptureFlowScreen.tsx    # Multi-stage capture workflow (camera, processing, result)
│   │   ├── DashboardScreen.tsx      # Site-wide analytics, average TWA, high-risk alerts, and sync state
│   │   ├── HomeScreen.tsx           # Active shift overview, latest reading gauge, and quick actions
│   │   ├── LoginScreen.tsx          # 4-digit PIN setup and authentication keypad
│   │   ├── SettingsScreen.tsx       # OEL threshold steppers, calibration config, CSV export, and logout
│   │   ├── ThemePreviewScreen.tsx   # Visual test suite for design tokens and typography
│   │   ├── WorkerHistoryScreen.tsx  # Longitudinal timeline and trend analysis for individual workers
│   │   └── WorkerRosterScreen.tsx   # Worker management, profile search, and new worker onboarding
│   ├── services/
│   │   ├── auth.ts                  # Local PIN hashing (SHA-256 fallback) and session management
│   │   ├── calibration.ts           # Calibration curve loader and piecewise linear interpolation
│   │   ├── csv.ts                   # OHS-compliant CSV serialization and file naming
│   │   ├── db.ts                    # SQLite database schema initialization, CRUD operations, and queries
│   │   ├── exposure.ts              # TWA computation, Austigard & Smedbold index, and risk band classification
│   │   └── imageProcessing.ts       # sRGB linearization, CIE XYZ, CIELAB, and CIEDE2000 colorimetry
│   ├── theme/
│   │   ├── colors.ts                # Palette definitions (blues, neutral backgrounds, semantic alerts)
│   │   ├── index.ts                 # Composite theme export
│   │   ├── radii.ts                 # Border radius tokens (cards, buttons, chips)
│   │   ├── shadows.ts               # Elevation and box shadow definitions
│   │   ├── spacing.ts               # Padding and margin scale (xs to xxl)
│   │   └── typography.ts            # Font families (DM Sans, Crimson Text) and type scale
│   └── types/
│       └── index.ts                 # Central TypeScript domain types, interfaces, and defaults
├── .claude/
│   └── settings.json                # Claude Code CLI plugin settings
├── AGENTS.md                        # Project agent rules (Expo v57 versioned documentation mandate)
├── App.tsx                          # App root component: font loading and DB lifecycle management
├── app.json                         # Expo configuration (permissions, plugins, orientation, splash)
├── package.json                     # NPM dependencies and project scripts
├── README.md                        # Complete technical documentation and mathematical derivations
└── tsconfig.json                    # TypeScript compiler configuration
```

---

## 9. Current State & Recent Commits Analysis

### 9.1 Commit History
* `80071b1` — Initial commit.
* `88562b9` — Full implementation of the VajraSetu occupational exposure platform, services, theme, and documentation.
* `c5f38cd` — `tsconfig.json` update (exclude `node_modules`, enable `skipLibCheck`).
* `5ccfd62` — Typo correction in documentation.
* `f8e747a` — *"testing languages"* (Recent experiment):
  - Updated `app.json` to add `expo-localization`.
  - Introduced prototypes in `src/screens/HomeScreen.tsx` and `src/screens/CaptureFlowScreen.tsx` testing internationalization (`react-i18next`), animated UI (`react-native-reanimated`, `expo-haptics`), a dwell-time auto-capture camera loop, and an interactive exposure chart (`ExposureLineChart`).

### 9.2 Pending Integration Notes (Commit `f8e747a`)
Commit `f8e747a` introduced work-in-progress imports in `HomeScreen.tsx` and `CaptureFlowScreen.tsx` that are not yet installed in `package.json` or defined in their respective service files:
1. **Uninstalled Packages:** `react-i18next`, `i18next`, `react-native-reanimated`, and `expo-haptics`.
2. **Missing Component:** `src/components/ExposureLineChart.tsx`.
3. **Missing DB / Type Methods:** `getProfile`, `ensureSingletonWorker`, `getReadingsForGraph`, and `WorkerProfile` in `src/services/db.ts` and `src/types/index.ts`.
4. **Stable Alternative:** Commit `5ccfd62` contains the fully self-contained, working baseline implementation of `HomeScreen.tsx` and `CaptureFlowScreen.tsx` which relies strictly on standard React Native, `expo-camera`, and the core component library.

---

## 10. Summary & Recommended Next Steps

VajraSetu demonstrates an end-to-end, scientifically grounded architecture combining chemical engineering with mobile edge computing:
1. **Accurate Colorimetry:** Complete CIEDE2000 and CIELAB transformations provide laboratory-grade color difference calculation on standard mobile hardware.
2. **Offline-First Resilience:** Fully autonomous local SQLite database and CSV export ensures operability in subterranean and zero-connectivity environments.
3. **Actionable Dosimetry:** Epidemiologically grounded TWA and $H_2S$ Index algorithms provide immediate, legally relevant worker safety feedback.

### Recommended Next Steps
* **Consolidate `f8e747a` Work:** Either finalize the localization/reanimated feature set (by installing `react-i18next`, `i18next`, `react-native-reanimated`, `expo-haptics`, and creating `ExposureLineChart.tsx`), or revert `HomeScreen.tsx` and `CaptureFlowScreen.tsx` to the stable `5ccfd62` baseline.
* **Empirical Calibration Data:** Replace placeholder values in `calibration/h2s_curve_v1.json` with actual laboratory spectrometry curves obtained from physical $CuSO_4$ test strips exposed in controlled $H_2S$ environmental test chambers.
* **Printed registration marks:** Add four non-reactive corner marks to the physical indicator card, then use the native OpenCV bridge to detect their quadrilateral and rectify perspective before sampling. The reactive CuSO4 and FeSO4 pads must not be used as geometry markers.
