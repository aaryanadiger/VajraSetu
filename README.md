# VarjraSetu

Vajra सेतु is an edge-computing occupational safety and exposure monitoring platform. It pairs low-cost colorimetric chemical sensor wristbands with mobile computer vision to measure cumulative toxic gas exposure (specifically Hydrogen Sulfide, H2S) for sanitation, sewer, and industrial workers.

The system performs real-time CIEDE2000 colorimetry directly on-device, calculates 8-hour Time-Weighted Average (TWA) exposures and hazard indices, and operates completely offline with local SQLite storage and CSV compliance reporting.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Chemical Sensing Mechanism](#chemical-sensing-mechanism)
- [Computer Vision and Colorimetric Engine](#computer-vision-and-colorimetric-engine)
  - [sRGB to CIELAB Transformation](#srgb-to-cielab-transformation)
  - [CIEDE2000 Color Difference Metric](#ciede2000-color-difference-metric)
  - [Band Validity and Shelf-Life Gating](#band-validity-and-shelf-life-gating)
  - [Dose Mapping and Calibration Curve](#dose-mapping-and-calibration-curve)
- [Dosimetry and Exposure Mathematics](#dosimetry-and-exposure-mathematics)
  - [Time-Weighted Average (TWA)](#time-weighted-average-twa)
  - [H2S Exposure Index (Austigard & Smedbold Model)](#h2s-exposure-index-austigard--smedbold-model)
  - [Risk Stratification Matrix](#risk-stratification-matrix)
- [System Architecture](#system-architecture)
- [Application Features](#application-features)
- [Database Schema](#database-schema)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Configuration and Calibration](#configuration-and-calibration)
- [Regulatory Standards and Compliance](#regulatory-standards-and-compliance)
- [License](#license)

---

## Overview

Industrial and municipal sanitation environments (sewers, manholes, wastewater treatment plants, and chemical refineries) present severe risks of acute and chronic Hydrogen Sulfide (H2S) poisoning. Conventional electronic gas detectors are bulky, capital-intensive, require continuous power and frequent sensor recalibration, and are rarely deployed individually to every sanitation worker in developing regions.

VarjraSetu bridges this gap by transforming an ultra-low-cost passive chemical wristband into an audited quantitative dosimeter using smartphone cameras. The system requires zero network connectivity, functioning autonomously at remote field sites.

---

## Problem Statement

H2S is a lethal neurotoxic and respiratory poison with the following physiological profiles:
- 0.01 - 1.5 ppm: Olfactory perception threshold (rotten egg odor).
- 2 - 5 ppm: Prolonged exposure causes eye irritation, headache, and bronchial constriction.
- 10 ppm: Indian Factory Act / ACGIH 8-hour Time-Weighted Average limit.
- 20 - 50 ppm: Olfactory nerve paralysis (loss of smell), leading to false perception of safety.
- 100+ ppm: Immediately Dangerous to Life or Health (IDLH); pulmonary edema and respiratory failure.

Because workers rapidly suffer olfactory fatigue at concentrations above 20 ppm, passive visual dosimeters that can be reliably digitized, quantified, and recorded by supervisors at the end of each shift are essential to prevent fatalities and document chronic exposure histories.

---

## Chemical Sensing Mechanism

The physical dosimeter utilizes a multi-zone passive test strip mounted on a wearable wristband:

1. **Sensing Matrix (CuSO4 + Glycerol + Matrix)**:
   Copper(II) Sulfate embedded in a hydro-absorbent glycerol matrix reacts selectively with gaseous H2S to precipitate insoluble Copper(II) Sulfide (CuS):
   
   ```
   CuSO4 (aq) + H2S (g) -> CuS (s) [Dark Brown / Black] + H2SO4 (aq)
   ```
   The optical density and color shift of the sensing patch correlate quantitatively with cumulative exposure dose (concentration multiplied by time, expressed in ppm-hours).

2. **FeSO4 Expiry and Oxidation Gating Dot**:
   A secondary Iron(II) Sulfate indicator dot monitors environmental degradation and oxidative shelf life. If the wristband has degraded from ambient oxygen or prolonged storage prior to deployment, the expiry indicator undergoes oxidation:
   
   ```
   4 FeSO4 + O2 + 2 H2O -> 4 Fe(OH)SO4
   ```
   If the color shift (Delta E) of the expiry patch exceeds calibrated limits, the application rejects the band as invalid, preventing false-safe readings.

3. **Printed White Reference Scale**:
   An inert reference target printed alongside the reactive zones allows the computer vision pipeline to calibrate for variable ambient illumination (color temperature, shadows, and lux levels) across different mobile devices and field lighting conditions.

---

## Computer Vision and Colorimetric Engine

The colorimetry pipeline executes entirely on-device without cloud dependencies. While an OpenCV bridge is available for perspective correction, the primary color transformations and distance metrics are implemented in pure TypeScript for determinism across platforms.

### sRGB to CIELAB Transformation

Digital cameras capture color in non-linear device-dependent sRGB. To achieve perceptual uniformity, values are linearized, transformed to CIE 1931 XYZ space under the D65 standard illuminant (neutral daylight, 6504 K), and subsequently mapped into CIELAB coordinates:

1. **sRGB Linearization**:
   ```
   C_linear = C_srgb / 12.92                        if C_srgb <= 0.04045
   C_linear = ((C_srgb + 0.055) / 1.055) ^ 2.4     if C_srgb > 0.04045
   ```

2. **Linear RGB to CIE XYZ (D65)**:
   ```
   X = 0.4124564 * R_lin + 0.3575761 * G_lin + 0.1804375 * B_lin
   Y = 0.2126729 * R_lin + 0.7151522 * G_lin + 0.0721750 * B_lin
   Z = 0.0193339 * R_lin + 0.1191920 * G_lin + 0.9503041 * B_lin
   ```

3. **CIE XYZ to CIELAB (L*, a*, b*)**:
   Using standard white point reference values (Xn = 0.95047, Yn = 1.00000, Zn = 1.08883):
   ```
   f(t) = t ^ (1/3)            if t > 0.008856
   f(t) = 7.787 * t + 16/116   if t <= 0.008856

   L* = 116 * f(Y / Yn) - 16
   a* = 500 * (f(X / Xn) - f(Y / Yn))
   b* = 200 * (f(Y / Yn) - f(Z / Zn))
   ```

### CIEDE2000 Color Difference Metric

Standard Euclidean distances in RGB or older Delta E 1976 (Delta E*ab) exhibit severe non-uniformities, particularly in blue and neutral gray regions. VarjraSetu implements the full **CIEDE2000 (Delta E 00)** specification (Sharma et al., 2005) incorporating:
- Chroma-dependent weighting (G factor)
- Hue rotation correction (RT term for the blue-purple boundary)
- Parametric weighting factors (kL = 1, kC = 1, kH = 1)

```
Delta_E_00 = sqrt(
  (Delta_L' / (kL * SL))^2 +
  (Delta_C' / (kC * SC))^2 +
  (Delta_H' / (kH * SH))^2 +
  RT * (Delta_C' / (kC * SC)) * (Delta_H' / (kH * SH))
)
```

### Band Validity and Shelf-Life Gating

Before computing exposure, the FeSO4 indicator reading is compared against the active calibration curve specification:
- If `expiryDeltaE > expiry_valid_range.max`, the reading is flagged as `INVALID_BAND`.
- The UI triggers an immediate warning indicating that the wristband has exceeded its shelf-life or suffered environmental contamination, preventing invalid exposure assessments.

### Dose Mapping and Calibration Curve

The sensing patch Delta E is evaluated against an empirical piecewise linear calibration dataset (`h2s_curve_v1.json`). If the measured Delta E equals or exceeds `sensing_saturation_delta_e` (default 55 Delta E), the reading is tagged as saturated, signifying severe overexposure beyond the linear operational dynamic range.

---

## Dosimetry and Exposure Mathematics

### Time-Weighted Average (TWA)

Cumulative dose is converted into an 8-hour or shift-equivalent Time-Weighted Average concentration:

```
TWA (ppm) = Cumulative Exposure (ppm-hr) / Shift Duration (hours)
```

### H2S Exposure Index (Austigard & Smedbold Model)

Adapted from occupational epidemiology models (Austigard & Smedbold 2022, *Annals of Work Exposures and Health*), VarjraSetu computes an indicative single-sample shift hazard score:

```
maxPpmEstimate = TWA * peakFactor   (default peakFactor = 2.0)
H2S Index = TWA + (maxPpmEstimate * weightFactor)
```

This metric flags shifts characterized by elevated baseline averages and suspected concentration spikes during confined space entry.

### Risk Stratification Matrix

| Classification | TWA Threshold (ppm) | H2S Index | Action Protocol |
| :--- | :--- | :--- | :--- |
| **Low Exposure** | < 2.5 ppm | < 10.0 | Shift within normal parameters. Routine sign-off. |
| **Elevated** | 2.5 - 5.0 ppm | 10.0 - 25.0 | Medical observation advised. Ventilation check required. |
| **High Risk** | > 5.0 ppm | > 25.0 | Statutory OEL breach. Immediate health check and incident report. |
| **Invalid** | Expiry out of bounds | N/A | Band corrupted. Rescan with backup or log hardware failure. |

---

## System Architecture

```
+-------------------------------------------------------------------+
|                        Physical Sensor Layer                      |
|  [CuSO4 Reaction Patch]    [FeSO4 Expiry Dot]    [Reference Card] |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     Mobile Optical Acquisition                    |
|   Expo Camera Module -> Alignment Overlay -> Shutter Capture      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                  Computer Vision Pipeline (Edge)                  |
|   1. Region of Interest (ROI) Sampling & Averaging                |
|   2. sRGB -> CIE XYZ (D65) -> CIELAB Conversion                   |
|   3. CIEDE2000 (Delta E 00) Computation vs Reference              |
|   4. Expiry Dot Validation Gate (Valid / Corrupted)               |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     Dosimetry Engine (Services)                   |
|   1. Piecewise Linear Interpolation (h2s_curve_v1.json)           |
|   2. Shift-Duration TWA (ppm) Computation                         |
|   3. Austigard & Smedbold Single-Sample H2S Index Calculation     |
|   4. Regulatory Threshold Classification (India OEL / ACGIH)      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                    Local Storage & Export Layer                   |
|   1. SQLite Database (WAL mode, offline-first)                    |
|   2. Supervisor Audit Log & Worker Exposure History               |
|   3. Compliance CSV Export via FileSystem & Sharing               |
+-------------------------------------------------------------------+
```

---

## Application Features

- **End-to-End Offline Execution**: No internet connection required. Operates reliably inside underground tunnels, rural sanitation sites, and concrete infrastructure.
- **Assisted Camera Targeting**: Custom visual viewfinder overlay ensures accurate distance, orientation, and centering of wristband circular patches.
- **Worker Roster and Shift Tracking**: Manage workforce profiles, site designations, and shift durations directly on-device.
- **Supervisor Authentication and Auditing**: PIN/password protected supervisor workspace preventing unauthorized modification of safety records.
- **Real-Time Visual Gauge**: Custom SVG-driven risk dial illustrating safe, elevated, and critical exposure bands.
- **Historical Trend Analysis**: Worker-specific exposure history charts to identify chronic exposure clusters and high-risk operational sites.
- **CSV Data Portability**: One-touch generation and export of standard OHS (Occupational Health & Safety) compliance spreadsheets.
- **Multilingual Ready**: Typography and layout architected for English, Hindi, and regional Indic scripts.

---

## Database Schema

VarjraSetu runs on an internal SQLite database engine (`vajra_setu.db`) with Write-Ahead Logging (WAL) enabled:

```sql
-- Workers Master
CREATE TABLE workers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    worker_code TEXT NOT NULL UNIQUE,
    site_id     TEXT NOT NULL DEFAULT 'DEFAULT_SITE',
    created_at  TEXT NOT NULL
);

-- Wristband Issuance
CREATE TABLE wristbands (
    id                          TEXT PRIMARY KEY,
    batch_id                    TEXT NOT NULL,
    issued_at                   TEXT NOT NULL,
    expiry_calibration_version  TEXT NOT NULL DEFAULT 'v1'
);

-- Shift Logs
CREATE TABLE shifts (
    id           TEXT PRIMARY KEY,
    worker_id    TEXT NOT NULL,
    start_time   TEXT NOT NULL,
    end_time     TEXT,
    wristband_id TEXT NOT NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id),
    FOREIGN KEY (wristband_id) REFERENCES wristbands(id)
);

-- Quantitative Readings
CREATE TABLE readings (
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

-- System Settings & Calibration Parameters
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Security Audit Logs
CREATE TABLE audit_logs (
    id          TEXT PRIMARY KEY,
    event_type  TEXT NOT NULL,
    details     TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
```

---

## Project Directory Structure

```
vajra-setu-app/
├── assets/                  # Application icons, splash screens, and vector assets
├── calibration/
│   └── h2s_curve_v1.json    # Piecewise Delta E to ppm-hr calibration curve data
├── src/
│   ├── components/          # Reusable UI component library
│   │   ├── ui/              # Badges, Buttons, Cards, Inputs, AppHeader
│   │   ├── CameraOverlay.tsx# Optical alignment target reticles
│   │   ├── ExposureGauge.tsx# Dynamic circular risk meter
│   │   └── CleanBottomTabBar.tsx
│   ├── navigation/          # Navigation graph and auth routing
│   │   ├── AppNavigator.tsx # Main tab and stack navigation definitions
│   │   └── RootNavigator.tsx# Authentication state router
│   ├── screens/             # Core application screens
│   │   ├── CaptureFlowScreen.tsx  # Multi-step camera capture & processing pipeline
│   │   ├── DashboardScreen.tsx    # Aggregate exposure analytics & trends
│   │   ├── HomeScreen.tsx         # Active shift overview & quick actions
│   │   ├── LoginScreen.tsx        # Supervisor access portal
│   │   ├── SettingsScreen.tsx     # OEL threshold & calibration config
│   │   ├── WorkerHistoryScreen.tsx# Individual longitudinal dosage log
│   │   └── WorkerRosterScreen.tsx # Worker management and site allocation
│   ├── services/            # Pure TypeScript application services
│   │   ├── auth.ts          # Supervisor authentication and session management
│   │   ├── calibration.ts   # Piecewise linear interpolation math
│   │   ├── csv.ts           # OHS compliance export generator
│   │   ├── db.ts            # SQLite database engine initialization and queries
│   │   ├── exposure.ts      # TWA, dose calculation, and risk classification
│   │   └── imageProcessing.ts # CIELAB conversion and CIEDE2000 colorimetry
│   ├── theme/               # Color palette, spacing, and typography tokens
│   └── types/               # TypeScript domain interfaces and type definitions
├── App.tsx                  # Root entry point with font loading and DB lifecycle
├── app.json                 # Expo project configuration
├── package.json             # NPM dependencies and run scripts
└── tsconfig.json            # TypeScript compiler configuration
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**
- **Expo Go** app installed on a physical mobile device (recommended for camera testing), or an Android/iOS emulator configured with camera emulation.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aaryanadiger/VarjraSetu.git
   cd VarjraSetu
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the Expo development server:
   ```bash
   npx expo start
   ```

2. Open the application:
   - **Physical Device**: Scan the QR code displayed in the terminal using the Expo Go application (Android) or the native Camera app (iOS).
   - **Android Emulator**: Press `a` in the terminal.
   - **iOS Simulator**: Press `i` in the terminal (macOS required).

---

## Configuration and Calibration

Custom calibration curves can be loaded into `/calibration` without modifying algorithm code. A calibration curve follows this structure:

```json
{
  "version": "v1",
  "description": "Standard CuSO4 + Glycerol formulation for H2S dosimetry",
  "expiry_valid_range": {
    "min": 0,
    "max": 8,
    "description": "Valid Delta E window for FeSO4 expiry dot"
  },
  "sensing_saturation_delta_e": 55,
  "points": [
    { "deltaE": 0,  "cumulative_ppm_hr": 0.0 },
    { "deltaE": 3,  "cumulative_ppm_hr": 0.5 },
    { "deltaE": 7,  "cumulative_ppm_hr": 2.0 },
    { "deltaE": 12, "cumulative_ppm_hr": 5.0 },
    { "deltaE": 18, "cumulative_ppm_hr": 10.0 },
    { "deltaE": 25, "cumulative_ppm_hr": 20.0 },
    { "deltaE": 33, "cumulative_ppm_hr": 35.0 },
    { "deltaE": 40, "cumulative_ppm_hr": 50.0 },
    { "deltaE": 47, "cumulative_ppm_hr": 70.0 },
    { "deltaE": 55, "cumulative_ppm_hr": 90.0 }
  ]
}
```

Thresholds for regulatory alerts can be configured in `SettingsScreen.tsx` or via the database `settings` table:
- `oel_twa_ppm`: Default `5.0` ppm
- `oel_stel_ppm`: Default `10.0` ppm
- `oel_ceiling_ppm`: Default `10.0` ppm

---

## Regulatory Standards and Compliance

The calculation models align with statutory guidelines:
- **India Factories Act (1948)** / **Schedule II Permissible Levels**: TWA 10 ppm, STEL 15 ppm (Configurable to lower safety bounds).
- **American Conference of Governmental Industrial Hygienists (ACGIH)**: TLV-TWA 1.0 ppm, TLV-STEL 5.0 ppm.
- **National Institute for Occupational Safety and Health (NIOSH)**: REL Ceiling 10 ppm (10 min), IDLH 100 ppm.
- **Occupational Safety and Health Administration (OSHA)**: General Industry Ceiling 20 ppm, Peak 50 ppm (10 min max).

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for complete details.

---

made with ❤️ by Butter Masala Dosa
