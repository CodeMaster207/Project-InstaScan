# Warranty & Returns Tracker

Scan a receipt and never miss a return window or warranty claim. Routine receipts are read privately on-device; messy or ambiguous ones escalate to the cloud using Firebase AI Logic hybrid inference.

Built for the #BuildHybridAI Hackathon 2026.

> **Status:** early development. Features below are the planned scope. Items marked *(stretch)* are built only if time allows.

## Features

### Scan receipts
- Capture a receipt with the camera or pick one from the gallery.
- A guide frame and tips help get a readable photo.
- Live status shows which path is working: "Reading on your device…" or "Taking a closer look in the cloud…".

### Automatic extraction
- Reads merchant, purchase date, currency, items with prices, and any printed return-policy text.
- Returns structured data that is validated before it is saved.

### Return and warranty deadlines
- Computes a **return deadline** and a **warranty expiry** for each item.
- Understands common policy wording such as "30 days" or "90 days with receipt".
- Falls back to editable per-merchant defaults when no policy is printed.
- Every deadline shows its **source**: printed on the receipt, estimated, or entered by you. Estimates are labeled "estimated, confirm with seller".

### Expiring-soon dashboard
- Items ranked by urgency and price, so a high-value item closing soon comes first.
- Countdown chips with four states: safe, soon, urgent, expired. States use icons or text as well as color.
- Toggle between Returns and Warranties.
- Summary line, for example "3 items expiring this week".

### Review and edit
- Check and correct extracted fields before saving.
- Low-confidence fields are highlighted.
- Edit deadlines, items and reminder timing.

### Item detail
- Large countdown for the return window and warranty.
- Receipt image kept as proof, with full-screen view.
- Extracted policy text.
- Mark an item as returned.

### Reminders
- Local notifications at 7 days and 1 day before a deadline.
- Tapping a reminder opens the item.

### Hybrid AI that you can see
- Each receipt carries a badge: **on-device** or **cloud**, with the reason shown on tap.
- Clear receipts are handled on-device. A receipt escalates to the cloud when extraction fails validation (for example, no parseable date or merchant, or totals that don't add up) or needs a stronger model.
- Cloud-only tasks include handwritten, crumpled or foreign-language receipts and warranty estimates when none is printed.

### Works offline
- Scanning works without a connection using the on-device result.
- Receipts that would have escalated are marked "needs refinement" and refined automatically once you are back online.
- Receipts and deadlines are stored locally on the device.

### Privacy by default
- Routine receipts never leave the device.
- The app shows which receipts were sent to the cloud.

## Planned extras *(stretch)*
- "I need to return this" screen with receipt proof, policy summary and a share button.
- Product-box scan to identify the item.
- Receipt history with search and status filters.
- CSV or PDF export.

## What this app does not do
- It does not give legal or tax advice.
- Warranty estimates are suggestions, not guarantees. Always confirm with the seller or manufacturer.

## Tech
- Android (Kotlin, Jetpack Compose)
- Firebase AI Logic hybrid inference (on-device model with cloud fallback)
- Local storage with Room
- Local notifications for reminders

## Design

Draft wireframes live in [Draft Img](Draft%20Img/). They show the planned full app (working name **InstaPay**), including expense and subscription views. The hackathon build focuses on the scan and warranty flow first.

### Sign-in Page
<img src="Draft%20Img/Sign-in%20Page.png" alt="Sign-in page wireframe" width="260">

*Users can register an account or use the app offline. AI calling still works without an account.*

### Navigation Bar
<img src="Draft%20Img/Navigation%20Bar.png" alt="Navigation bar wireframe" width="260">

*A side menu to move between Scan Receipt, Subscriptions Overview, Expenses Overview and Sync Settings, with the signed-in account shown at the bottom.*

### Scan Page (a): Camera
<img src="Draft%20Img/Scan%20Page%20%28a%29.png" alt="Scan page camera wireframe" width="260">

*The user scans a receipt with the camera. A toggle switches between Auto (AI) and Manual entry.*

### Scan Page (b): Verify details
<img src="Draft%20Img/Scan%20Page%20%28b%29.png" alt="Scan page details wireframe" width="260">

*After scanning, the user verifies or adds the details: name, amount, warranty end date and provider, subscription cycle and discount, and a reminder.*

### Warranty Page
<img src="Draft%20Img/Warranty%20Page.png" alt="Warranty page wireframe" width="260">

*After scanning, warranties are listed as Active (not yet expired), Inactive (expired) or Pending (needs activation). Each has a remove button and a notification toggle.*

### Expenses Page
<img src="Draft%20Img/Expenses%20Page.png" alt="Expenses page wireframe" width="260">

*After scanning receipts, the user can see what they spent, filtered by today, month, year or all, with a total, a pie chart and a CSV export. Items that are not expenses can be removed.*

### Expenses Edit Page
<img src="Draft%20Img/Expenses%20Edit%20Page.png" alt="Expenses edit page wireframe" width="260">

*The user can edit an expense's details afterward, or switch to view the scanned receipt.*

### Subscriptions Page
<img src="Draft%20Img/Subscriptions%20Page.png" alt="Subscriptions page wireframe" width="260">

*Subscriptions found in receipts (for example a gym membership) are split into Active (to be charged next cycle) and Inactive (not charged next cycle).*

### Colour Scheme
<img src="Draft%20Img/Colour%20Scheme.png" alt="Colour scheme" width="120">

*The palette: `#f5e6e8`, `#d5c6e0`, `#aaa1c8`, `#967aa1` and `#192a51`.*

## Project docs
- [App Idea.md](App%20Idea.md): build order, scope and cut list

## Getting started
Setup instructions will be added once the project is scaffolded.
