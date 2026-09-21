# Scanner and calibration

## Purpose and safe use

The scanner is a prototype aid for reading the colour state of a passive wristband after a work period. It does not detect live atmospheric H₂S, does not see short-lived peaks, and must never replace a site-approved gas detector, confined-space controls, PPE, a trained supervisor, or an emergency plan.

Treat the current app output as one of three **colour categories**—low, elevated, or high—until the exact card design has been calibrated and independently validated. ppm·hr, TWA, index, and validity values in the prototype are engineering estimates, not compliance results.

Never create, release, or expose people to H₂S to test the app. Use certified calibration gas and an approved laboratory or EHS facility.

## Physical card expected by the app

The camera guide expects a small indicator card with a repeatable orientation:

```text
upper-left     CuSO₄ sensing patch (blue/green → brown → black)
centre-right   FeSO₄ expiry dot
upper-right    light/neutral printed reference area
```

The scanner searches a central square and samples these regions at fixed relative positions. Keep the card flat, complete, clean, dry, and fully inside the camera frame. Do not use the reactive areas themselves as registration marks.

### Recommended production-card change

Print four small, non-reactive, high-contrast registration marks or a code around the card. This enables the next scanner version to find a quadrilateral, correct perspective, and sample the exact physical locations even when the band is tilted. It also makes card/batch identification possible.

## What happens during a scan

1. The user grants camera access and aligns the physical card to the blue-square and yellow-circle guides.
2. The app samples small preview JPEGs roughly every 1.25 seconds.
3. A candidate card must show a plausible neutral reference plus distinct sensing and expiry areas. Two consecutive successful samples show **Aligned — ready to scan**.
4. On tap, three higher-quality JPEGs are captured while the user holds steady.
5. `react-native-fast-opencv` decodes each JPEG. Deterministic TypeScript searches and samples each frame independently.
6. The app rejects the scan if cross-frame CIEDE2000 differences indicate movement or changing light. Otherwise it uses median RGB values to reduce camera noise.
7. The white reference normalises colour shifts caused by warm/cool lighting. The app then computes CIEDE2000 ΔE from the v2 fresh references measured from the supplied photographs.
8. FeSO₄ must be both close to the measured fresh reference and remain in the expected yellow colour family. The CuSO₄ patch produces a colour category and limited-range ppm·hr estimate.
9. The result, image-quality score, sample count, saturation state, linked wristband record, and an 8-hour reference shift are saved to local SQLite.

## Recognition checks and user feedback

| App feedback | Meaning | Operator action |
| --- | --- | --- |
| `Checking card position…` | Preview is being sampled. | Hold still briefly. |
| `Aligned — ready to scan` | Two successive samples passed card and lighting checks. | Capture the image. |
| `Move the card into the guides` | Card layout was not recognised. | Centre only the small indicator card; ensure both reactive areas are visible. |
| `Use even light` | Reference is too dark, bright, or coloured. | Move away from glare/shadow; use diffuse light. |
| `Open the development build to scan` | Native image module is unavailable, usually Expo Go. | Install/run the iOS or Android development build. |
| `Replace the wristband` | Expiry gate failed. | Do not use the exposure result; use a new band and rescan. |

## Image-processing details

The image pipeline in `src/services/imageProcessing.ts` uses:

- sRGB → linear RGB → CIE XYZ (D65) → CIELAB conversion.
- CIEDE2000 (ΔE00) for perceptual colour difference.
- Bounded scale/offset card search, so surrounding skin, clothing, and work surfaces are less likely to be sampled.
- A trimmed mean over each region to discard colour outliers from highlights and edges.
- Light/reference checks before extracting the result.

The implementation intentionally has no ML classifier or dataset dependency. A data set becomes useful later for validating thresholds, device robustness, and a future card detector—not for replacing the known-layout sampling logic.

## Current colour and exposure rules

After white balancing against the captured reference patch, calibration v2 compares patches with measured references stored in `calibration/h2s_curve_v2.json`:

- CuSO₄ fresh baseline: `{ r: 195, g: 231, b: 216 }`
- FeSO₄ fresh baseline: `{ r: 245, g: 208, b: 123 }`

CuSO₄ category is rules-based:

| Category | Current rule |
| --- | --- |
| `low` | Fresh region, sensing ΔE ≤ 10. |
| `elevated` | Intermediate measured colour, sensing ΔE > 10. |
| `high` | Dark region: mean brightness < 120, ΔE ≥ 30, or the measured range is saturated. |

Calibration v2 uses the supplied 30 ppm exposures. Dose is concentration multiplied by duration:

| Test duration | Cumulative dose |
| --- | --- |
| 0 minutes | 0 ppm·hr |
| 5 minutes | 2.5 ppm·hr |
| 10 minutes | 5 ppm·hr |
| 15 minutes | 7.5 ppm·hr |
| 30 minutes | 15 ppm·hr |

The photographed 5, 10, and 15 minute patches are not monotonic and the 5/15 minute colours substantially overlap. V2 therefore pools this region around a 5 ppm·hr midpoint rather than claiming those samples can be separated reliably. At or above the dark 30-minute control, the result is a lower bound of `≥15 ppm·hr`.

The Factories Act Second Schedule reference is 10 ppm over 8 hours (80 ppm·hr) and 15 ppm over 15 minutes (3.75 ppm·hr). At 30 ppm, equivalent calibration durations would be 160 minutes and 7.5 minutes respectively. The supplied test series brackets the short-term dose but does not reach the full-shift dose. TWA is displayed as:

```text
TWA ppm = cumulative ppm·hr / 8 hours
```

The eight-hour value is fixed in `CaptureFlowScreen.tsx`. Once the sensing patch reaches the upper measured colour, both ppm·hr and TWA are displayed as lower bounds; they must not be compared as exact values against the 80 ppm·hr full-shift reference.

## Calibration requirements before a field trial

Use a documented controlled study for the exact final formulation, substrate, dot geometry, print specification, phone model mix, and operating conditions.

1. **Create a test plan.** Define batches, target humidity/temperature/light conditions, H₂S dose points, replicate count, device models, and pass/fail accuracy limits before collecting data.
2. **Prepare controls.** Include unexposed cards, expiry-aged cards, and blank/reference cards from each production batch.
3. **Use controlled exposure only.** An accredited lab or EHS facility should expose cards using certified gas, appropriate engineering controls, and documented dose/time.
4. **Capture repeatable images.** For every control, capture multiple images across intended phone models and representative lighting. Keep the physical orientation and distance protocol fixed.
5. **Establish the ΔE curve.** Fit only within the verified dynamic range, retain error/uncertainty data, and define the saturation threshold from evidence rather than assumption.
6. **Establish the validity rule.** Measure fresh versus expired/compromised FeSO₄ dots and choose a validity range that meets an agreed false-valid risk target.
7. **Validate independently.** Hold out cards, batches, operators, and devices. Measure false-ready, unreadable, invalid-band, category, and dose-estimation errors separately.
8. **Version and lock the calibration.** Create a new versioned JSON asset, record the source study, then link every stored reading to that version. Do not overwrite historical calibration files.
9. **Run usability testing.** Observe workers performing the scan in normal PPE and work lighting. Measure retry rate, alignment time, comprehension, and unsafe interpretations.
10. **Obtain professional review.** An industrial hygienist/EHS lead and relevant legal/regulatory reviewer must approve the intended operational use.

## Versioned validity rule

The runtime reads FeSO₄ references and gates from the active calibration JSON. V2 accepts a fresh-reference ΔE of 0–18 only when the corrected patch is also clearly yellow: sufficiently bright, red/green above blue, and not strongly green-dominant. This fixes the false rejection seen when the real fresh yellow patch produced ΔE 11.40 against the old placeholder reference. Expired controls are still required to validate the false-valid rate.

## Practical scanner test matrix

Run the following on each intended device. Record the result, image, card batch, app version, and any retry/error message.

| Scenario | Expected behaviour |
| --- | --- |
| Empty frame | Never reports aligned; asks user to move card. |
| Correct fresh card, diffuse indoor light | Aligns after two previews, captures three consistent frames, and displays estimated ppm·hr. |
| Card or phone moves during final capture | Rejects the scan instead of averaging inconsistent colours. |
| Correct card, moderate tilt | Current prototype may reject it; document the angle where it becomes unreliable. |
| Correct card, direct glare | Requests even light or remains unaligned. |
| Card cropped or one patch hidden | Never reports aligned. |
| Blue/green, brown, and dark reference cards | Produces stable low/elevated/high categories only after lab labels exist. |
| Aged/invalid expiry control | Shows replacement path and does not invite reliance on exposure number. |
| Airplane mode | Scan and local result still work; translation uses bundled/cache text. |
| Expo Go | Explains that the development build is required; does not fabricate a scan result. |

## Test evidence to retain

- App version, calibration version, phone model, OS, camera settings, and native build type.
- Card batch/lot, manufacturing date, controlled exposure conditions, and reference instrument results.
- Raw capture files stored under an approved data-retention policy, not in git.
- Alignment pass/retry time and operator feedback.
- Error matrix, confidence/uncertainty analysis, and approval/sign-off record.
