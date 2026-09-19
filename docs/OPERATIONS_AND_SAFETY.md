# Worker operation and safety guide

## Who this app is for

Vajra Setu is intended for an individual worker using one assigned phone and passive indicator wristbands. It helps record the visible state of a wristband after a work period in a low-cognitive-load flow.

It is not a live gas alarm, personal protective equipment, a replacement for a certified gas detector, or a rescue tool.

## First-time setup

1. Open the app.
2. Enter your name, worker ID, and site/factory.
3. Tap **Continue**.
4. On Home, use the language icon to choose English, Bhojpuri, Hindi, Marathi, or Kannada.

The profile is stored only on the phone. There is no remote login and no automatic backup in the current app.

## Normal worker flow

1. **Before use:** keep the wristband patch clean, dry, visible, and attached as instructed by the site.
2. **When instructed / after the work period:** open Vajra Setu and tap **Scan wristband**.
3. **Camera permission:** tap **Allow camera** if prompted.
4. **Align:** place only the small indicator card inside the white camera frame. Match the blue-square and yellow-circle guides to the printed patches. Hold the phone steady.
5. **Wait for confirmation:** scan only when the app says **Aligned — ready to scan**.
6. **Capture:** tap the scan button once.
7. **Read the result:** use the words and action message, not colour alone. The screen will show a low/elevated/high colour category or ask you to replace the band.
8. **Act safely:** continue to follow local work controls, site alarms, and supervisor instructions. Open History if you need to view prior device-local checks.

## How to respond to app results

| Result | What it means in the prototype | What to do |
| --- | --- | --- |
| `LOW` | The sampled CuSO₄ colour is in the prototype low category and the expiry gate passed. | Continue normal site procedures. This does not prove that air is safe or override a gas detector/alarm. |
| `ELEVATED` | The sampled colour crossed an early prototype category boundary. | Pause when safe, move to a safe location as required, and notify the supervisor/site lead. Follow the site's hazard procedure. |
| `HIGH` | The sampled colour is dark/high category or the provisional response is saturated. | Treat as a warning to stop relying on the wristband result; leave/avoid the affected area as required by the site procedure and inform the supervisor immediately. |
| `Replace wristband` / invalid | The expiry patch failed its validity gate. | Do not rely on the scan. Replace the band, document the issue as required, and scan the new band. |
| `Try that scan again` | The camera could not reliably read the card. | Use even light, centre the full card, keep both patches visible, and try again. |

If anyone feels unwell, an alarm sounds, or a trained safety procedure tells you to stop: stop work, move to fresh air/safe location as instructed, alert the supervisor, and follow the site emergency plan. Do not attempt a gas-area entry or rescue unless trained, authorised, and equipped under the site procedure.

## What the numbers mean—and do not mean

- **Colour category:** a deterministic comparison of the CuSO₄ patch to a provisional baseline. This is the most defensible current scanner output.
- **Expiry ΔE:** how different the FeSO₄ expiry dot appears from its provisional fresh baseline after light correction.
- **Cumulative ppm·hr / TWA / H₂S index:** estimates produced by a placeholder curve and a fixed eight-hour reference period. They are not validated exposure measurements.
- **India reference value shown in the UI:** a fixed app reference used for display; it is not editable by the worker and is not a statement that the scan establishes compliance.

The app cannot detect a sudden gas release, absence of oxygen, other toxic gases, or a failure in PPE. Its result must never overrule a direct-reading instrument, alarm, safety officer, or emergency instruction.

## Safe scanning conditions

- Use even, diffuse light. Avoid sunlight glare, strong reflections, coloured lamps, and deep shadows.
- Keep the phone lens clean.
- Keep the card flat and inside the guide; the current prototype is not robust to substantial rotation or perspective.
- Do not scan a wet, damaged, contaminated, torn, or partially hidden card.
- Use only wristbands/indicator cards that match the physical layout and batch calibration intended for this app version.
- Do not interpret an unreadable scan as a safe result.

## Data and privacy

The app stores profile data, readings, wristband records, shifts, language preference, and translation cache locally in Expo SQLite. A captured-image URI may be stored with a reading. There is no cloud sync or account recovery.

Before handing a phone to another person, repairing it, or uninstalling the app:

1. Follow the organisation's data-retention and consent policy.
2. Export or record the required data using an approved workflow.
3. Remember that uninstalling the app or clearing device data can remove locally stored records.

The CSV service currently generates CSV text. The app does not yet implement a secure share/save workflow, encrypted backup, role-based access, or remote audit trail.

## Translation behaviour

Critical short phrases are bundled with the app for the supported languages. Hindi, Marathi, and Kannada may request Sarvam translation for less-common UI text when a network/API key is configured; those results are cached on-device. Bhojpuri follows the bundled/offline phrase path.

For safety-critical messages, English fallback is preferable to a missing or uncertain translation. Validate all worker-facing terms with native-speaking users from the intended worksite before release.

## Supervisor / pilot owner checklist

Before asking workers to use a pilot build:

- Confirm the card is calibrated and versioned for the exact physical band batch.
- Confirm phone model/OS compatibility and run the scanner test matrix.
- Train workers on the difference between a passive post-exposure aid and a live detector.
- Provide an approved emergency escalation procedure and identify the person to contact.
- Review language with native speakers and test it under real reading conditions.
- Define who may access/export local health-related data and how long it is retained.
- Define a safe fallback if the camera, app, card, or phone is unavailable.
- Obtain EHS, legal/regulatory, and privacy review before any operational safety claim.

## Production blockers

Do not describe the current build as a compliance monitor or deploy it as a sole safety control until these are complete:

1. Controlled calibration and independent validation of sensing and expiry rules.
2. Controlled validation of the authoritative, versioned expiry threshold and its false-valid rate.
3. Production-grade identity/access control and encrypted data/export handling.
4. A secure translation backend—no secret API key embedded in the mobile bundle.
5. Actual-shift capture instead of the fixed eight-hour scan assumption.
6. Device and usability validation across workers, lighting, PPE, and intended card batches.
7. Documented incident, support, data-retention, and update procedures.
