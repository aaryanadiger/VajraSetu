# Scanner and calibration

## Purpose and safe use

The scanner is a prototype aid for reading the colour state of a passive wristband after a work period. It does not detect live atmospheric H₂S, does not see short-lived peaks, and must never replace a site-approved gas detector, confined-space controls, PPE, a trained supervisor, or an emergency plan.

Treat the current app output as one of three **colour categories**—low, elevated, or high—until the exact card design has been calibrated and independently validated. ppm·hr, TWA, index, and validity values in the prototype are engineering estimates, not compliance results.

Never create, release, or expose people to H₂S to test the app. Use certified calibration gas and an approved laboratory or EHS facility.

## Physical band and automatic capture

The scanner uses the separate CuSO₄ sensing pad, FeSO₄ yellow/brown dot and elongated printed blue/brown reference scale shown in the supplied physical-band photo. It no longer assumes a square card or fixed relative positions. The detector groups connected colour regions, checks shapes and spacing, and uses the scale's principal axis to handle rotation. Neighbouring blue/brown scale sections can be joined across a desaturated gap. Pair proximity discourages mixing indicators from different bands.

The neutral band backing beside the printed scale supplies lighting normalisation; coloured swatches are required for recognition and are not treated as white. The detector is a deterministic prototype, not a trained or clinically validated classifier. Unsupported layouts, missing scales and unrecognised expired-dot colours may remain unreadable. A photograph establishes recognition coverage for those examples only, not chemical calibration accuracy.

The camera scans automatically after three consistent observations held for at least 900 ms. It checks colour, quality, position, size and orientation, then captures three final JPEGs. Changed geometry or inconsistent colours reject the final burst. A recoverable failure retries automatically; after two failed bursts an explicit retry action appears. Normal scans have no shutter button. Leaving the camera or backgrounding the app cancels stale observations and prevents saving an interrupted scan.

Preview photographs use a supported size near 1280 pixels and JPEG quality 0.45 to preserve the small indicators. The camera samples again after a 500 ms pause. Zoom/torch changes reset the hold. Camera JPEGs and processing stay on the phone. Expo Go has no native OpenCV decoder and cannot return a scan.

Lighting advice is only shown after the strip/dot/scale arrangement has been recognised. An empty or unrelated scene stays in the looking-for-band state. The lens-cleaning tip is a suggestion after repeated failures, not a claim that dirt was detected.

Regression coverage includes downsampled BGR copies of the user's physical-band photo and reported empty-camera screenshot, all three physical bands cropped individually, four right-angle rotations, synthetic strip/dot/scale images, movement and colour instability, exposure calibration and CSV export. Physical live-camera testing remains necessary after each iPhone install.

## Current colour and exposure rules

After white balancing against the captured reference patch, calibration v2 compares patches with measured references stored in `calibration/h2s_curve_v2.json`:

- CuSO₄ fresh baseline: `{ r: 195, g: 231, b: 216 }`
- FeSO₄ fresh baseline: `{ r: 245, g: 208, b: 123 }`

CuSO₄ category is rules-based:

| Category | Current rule |
| --- | --- |
| `low` | Bright blue/green fresh colour family, or sensing ΔE ≤ 10. A fresh-colour match forces the estimated dose to zero so phone/lighting variation cannot create a false exposure warning. |
| `elevated` | Olive/brown intermediate colour outside the fresh family with sensing ΔE > 10. |
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

The runtime validates every registered JSON curve during startup, freezes it in memory, and rejects duplicate/out-of-order points, decreasing dose values, invalid RGB data, malformed gates, and unknown active versions. The active version is explicit in Settings and every result/reading. A changed curve must be a new versioned asset; existing versions are immutable.

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

### Live camera segmentation regression

The close-up camera failure on 2 November exposed two gaps: the textured green pad fragmented at the previous RGB threshold, and a generic chroma mask joined warm backing paper to the printed scale. Segmentation now estimates a bounded illuminant correction from bright backing, accepts both blue/cyan and green sensing pads, closes small gaps in the sensing mask, and uses separate blue/brown scale proposals alongside the existing desaturated-scale proposals. Short scale ends can be joined by their centre alignment even when their individual principal axes point sideways. Raw sampled RGB and the chemical calibration are unchanged.

`live-band-close.bgr` is the 184×195 camera-only crop of that failure screenshot, excluding app controls. Tests cover the actual image, modest warm/cool colour casts, blue sensing pads and automatic-capture readiness, alongside the earlier positive and negative fixtures.
