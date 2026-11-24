# Warranty & Returns Tracker: What to Build

Target: #BuildHybridAI Hackathon 2026 (Firebase AI Logic hybrid inference).
Submission deadline: Nov 30, 2026 (per a third-party summary; confirm against the official Devpost rules).
Platform: native Android (Kotlin, Jetpack Compose) on a physical phone that supports Gemini Nano.

## One-line pitch

Scan a receipt and never miss a return window or warranty claim. Routine receipts are read privately on-device; messy or ambiguous ones escalate to the cloud.

## Build in this order

Stop after any step and you still have a working demo. Do not start a step until the one before it works.

### 1. Hybrid call works (the foundation)
- Android project with Firebase AI Logic and the on-device dependency set up.
- One call with `PREFER_ON_DEVICE` that takes a receipt photo and returns text.
- Done when: a receipt image produces a model response on the phone.

### 2. Receipt extraction
- Image picker or camera capture.
- Prompt that returns JSON: merchant, purchase date, currency, items with prices, any printed return-policy text.
- Parse and validate the JSON.
- Done when: 5 or more sample receipts extract correctly.

### 3. Deadline computation
- Turn policy text into days ("30 days", "90 days with receipt").
- Per-merchant default when no policy is printed (user-editable).
- Compute return deadline and warranty expiry per item.
- Each deadline carries a source: printed, estimated, or user-entered.
- Done when: a scanned receipt produces a correct deadline with its source.

### 4. Save and show
- Local storage (Room) for receipts, items and deadlines.
- Dashboard: items ranked by urgency and price, countdown chip (safe, soon, urgent, expired).
- Item detail with the receipt image and countdown.
- Done when: you can scan, save, close the app, reopen it, and see the list.

### 5. Review and edit screen
- Editable merchant, date, items and deadlines before saving.
- Source label on each deadline, "estimated" marked clearly.
- Done when: a wrong extraction can be corrected by hand.

### 6. Reminders
- Local notifications at 7 days and 1 day before expiry.
- Tapping a notification opens the item.
- Done when: a test reminder fires and opens the right item.

### 7. Visible hybrid behavior (what the judges score)
- Path badge on each receipt: on-device or cloud, with the reason on tap.
- Escalate to the cloud when extraction fails validation (no parseable date or merchant, totals don't add up) or the receipt needs a stronger model.
- Offline: save the on-device result, mark "needs refinement", and refine when back online.
- Done when: a clean receipt stays on-device, a bad one escalates, and an airplane-mode scan works.

### 8. Submission
- README with setup steps, a short write-up of how hybrid inference is used, and accuracy notes from your sample receipts.
- Demo video.
- Devpost submission.

## Screens needed (minimum)

1. Dashboard ("Expiring soon")
2. Scan
3. Review and edit
4. Item detail

Everything else (history, settings, onboarding) is optional.

## Cut list (drop these first)

1. Product-box scan
2. CSV or PDF export
3. "I need to return this" proof screen
4. Receipt history and search
5. Onboarding slides
6. Settings page (keep default reminder timing hardcoded)

## Rules for the app

- Warranty estimates from the cloud are suggestions. Label them "estimated, confirm with seller".
- Always show where a deadline came from and let the user edit it.
- Do not give legal or tax advice.

## Demo (under 3 minutes unless the rules say otherwise)

1. "You bought a laptop 25 days ago. Can you still return it?"
2. Scan a clean receipt: instant result, on-device badge, deadline appears.
3. Airplane mode, scan another: still works, queued for refinement.
4. Scan a messy receipt: escalates, cloud badge, reason shown.
5. Dashboard ranked by urgency, then a reminder notification.
6. Close on privacy: routine receipts never leave the device.

## Risks

- **On-device image support is beta and device-dependent.** Test on a real supported phone first. If it fails, build with cloud only and add the on-device path afterward.
- **Receipts rarely print return policies.** Use editable merchant defaults and labeled estimates, and say so in the write-up.
- **Unverified hackathon rules.** Read the official Devpost rules before submitting.

## Submission checklist

- [ ] Official rules read, requirements noted
- [ ] Working app and repo with README
- [ ] Demo video recorded
- [ ] Devpost text: problem, solution, how hybrid inference is used, accuracy notes
- [ ] Submitted before Nov 30
