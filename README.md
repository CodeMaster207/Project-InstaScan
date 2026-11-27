# InstaScan: Warranty & Receipt Scanner

Scan a receipt and keep track of your warranties. Routine receipts are read **privately on your device**; messy ones are escalated to the **cloud**, using Firebase AI Logic hybrid inference.

Built for the #BuildHybridAI Hackathon 2026. Platform: **Web (Chrome)**.

**Live demo:** https://project-instascan.web.app (use desktop Chrome; see "Getting started" below to turn on the on-device model)

## The problem and the value

Warranties and return windows are easy to miss. The proof is a paper receipt that fades, gets lost, or sits in a drawer, and by the time something breaks nobody remembers when it was bought or how long the cover lasted. Typing every receipt into an app by hand is tedious, so people don't.

Sending every receipt photo to a cloud AI solves the typing but not the privacy: a receipt shows what you buy, where and when.

**InstaScan's answer is hybrid AI.**
- A photo is first read by the **on-device model in Chrome**: instant, private, and it works offline once the model is downloaded.
- The app **checks the answer** itself. If the on-device result is not good enough (for example, no valid purchase date or no valid total), only then does it ask the **cloud model**, and it tells you that it did and why.
- Every receipt carries a badge, **On-device** or **Cloud**, so you always know whether it left your device.

## How it uses Firebase AI Logic

All of the AI code is in [`web/src/core/ai.ts`](web/src/core/ai.ts).

- **Hybrid inference.** `getGenerativeModel` is created with `InferenceMode.PREFER_ON_DEVICE` for the first read, and with `InferenceMode.ONLY_IN_CLOUD` for the retry. If the browser has no on-device model, the SDK answers from the cloud by itself.
- **Image input and structured output.** The receipt photo is sent as an inline image, and both paths are given the same response schema (`itemName`, `merchant`, `purchaseDate`, `total`, `currency`, optional `warrantyMonths`, `policyText`, `category` and `isSubscription`), so the answer is JSON, not free text.
- **The router.** After the on-device answer, [`web/src/core/validate.ts`](web/src/core/validate.ts) decides whether to keep it. Receipt dates such as `03/10/26 11:08` are normalised first ([`web/src/core/deadlines.ts`](web/src/core/deadlines.ts)), because small models often copy dates as printed.
- **Showing the path.** `result.response.inferenceSource` tells which path answered, and that drives the badge and the explanation on screen.
- **On-device model download.** `initializeDeviceModel` is called from the user's scan click, with progress shown.
- **App Check.** Firebase AI Logic requires it, so `initializeAppCheck` is set up in [`web/src/core/firebase.ts`](web/src/core/firebase.ts) before the first call (debug token in development, reCAPTCHA Enterprise or a registered debug token for a hosted build).

Other Firebase products used (all optional for the user):

- **Authentication** ([`web/src/core/auth.ts`](web/src/core/auth.ts)): email and password accounts.
- **Cloud Firestore** ([`web/src/core/sync.ts`](web/src/core/sync.ts)): opt-in backup and sync of item details, stored under `users/{uid}/items` and protected by [`web/firestore.rules`](web/firestore.rules). Receipt photos are never uploaded.
- **Firebase Hosting:** serves the app.

## Features (built)

All the pages in the design drafts below are built.

**Scan**
- Scan with the camera (the arrow tucks the buttons away) or upload a photo (JPEG or PNG), in **Auto (AI)** or **Manual** mode.
- **Hybrid extraction:** on-device first, cloud fallback, a live status ("Reading on your device…", "Taking a closer look in the cloud…"), and an **On-device / Cloud / Manual** badge with the reason.
- The AI also suggests a **category** and whether the receipt is a **subscription**. You can change both.
- **Review before saving:** one form for name, amount, purchase date, category, warranty, subscription details and a reminder. Nothing is saved until you press **Add!**
- **Calendar pickers:** every date (purchase date, warranty end date, next payment, discount dates) has a calendar button that opens the browser's own native calendar, which is the system calendar on phones. Typing a date still works, and optional dates have a clear button.
- **Warranty only when there is one:** the warranty panel starts hidden behind an **Add a warranty** button, and opens by itself when the receipt prints a warranty. **Remove warranty** hides it again and clears it, so an item without a warranty stays off the Warranty page and only shows as an expense.
- **No guessing:** a warranty end date is only worked out when a warranty length is printed on the receipt. The store name is shown as information and is not assumed to be the warranty provider.
- **Keep or convert:** when the amount is in another currency (for example a receipt read as `USD 25.00`), the form asks what to save. **Keep USD 25.00** is the default, or **Convert to** your default currency (or any other the rates cover) with a live preview such as `RM 102.27`. A converted item keeps its original amount and the rate's date, shown as "was USD 25.00" in the lists and "Originally USD 25.00, converted at the 2026-11-26 rate" on the edit page. Nothing is converted unless you choose to.

**Warranty**
- Active, Inactive and Pending lists with day countdowns, an activate button, a reminder bell, edit, and remove (which removes the warranty and keeps the expense).

**Expenses Overview**
- Filter by Today, Month, Year or All, with the total spent, a **pie chart by category** (with a text legend, so it never relies on colour alone) and **Print as CSV**.
- **Automatic currency conversion:** amounts in other currencies are converted into your default currency for totals and the chart, using the latest European Central Bank rate (about 30 currencies, including MYR, USD, EUR, GBP and SGD). Each row keeps its original amount and shows the conversion under it (for example `USD 55.00`, `≈ RM 225.00`), and the CSV has both columns. A currency with no rate is left out of the total and named, instead of being guessed.
- The conversion can be switched off in Sync Settings, and then each currency is totalled separately and never added to another. It also falls back to that when no rates are available, and cached rates keep it working offline.
- **Not an expense** (the X) takes an item out of the list, and edit opens the item.

**Subscriptions Overview**
- Active (charged next cycle) and Inactive lists, the next payment date with days left, the total due next cycle, discounts, a "payment coming up" banner, **Not a subscription**, and **Print as CSV**.

**Edit page**
- **Details** and **Receipt** tabs. The receipt photo is kept on the device only.

**Sync Settings and accounts**
- **Optional accounts** with Firebase Authentication (email and password), or use the app offline.
- **Optional sync, off until you turn it on.** Nothing is uploaded unless you opt in. A button in the bottom-right corner makes it easy: **Turn on sync** for a signed-in person, or **Sign in to sync** if you have no account yet. It shows on every page, has a small **×** to hide it (it stays hidden, and comes back if you later switch sync off), explains what is stored before turning sync on, and disappears once sync is running. When on, item details (not receipt photos) are backed up to Cloud Firestore under your account and merged across devices (the newest change wins, and deletions are kept in sync). You can switch sync off in Sync Settings (and it stays off), and you can **delete your cloud backup** or **delete the data on this device** at any time.
- **Deleting while offline is safe, and new items are announced.** An item you delete while signed out, offline or with sync off is removed only from that device, and the app says so before you confirm. Your account's copy is kept, so the item comes back automatically at your next sync (for example when you sign in again or the network returns). Whenever a sync brings items to a device that did not have them, a pop-up lists what was found. Deleting while online with sync on still removes the item everywhere.
- **Opting in is per account, and shared devices are protected.** Sync only ever runs for the account that opted in, so someone else signing in on the same device is not synced until they agree themselves. If a different account turns sync on while the device still holds another account's items, the app asks whether to add those items to the new account or remove them from the device. Items you made offline before registering are simply added to your account when you opt in.
- A default currency, the automatic-conversion switch, and an "Update exchange rates" button. While you type an amount in another currency, the form shows what it is worth in your own (for example `≈ RM 225.00 at the 2026-11-26 rate`).

**Reminders**
- An "expiring soon" banner on Warranty, a "payment coming up" banner on Subscriptions, and browser notifications while the app is open.

**Safety and quality**
- Sign-in has plain-language errors, and "Forgot your password?" never reveals whether an email has an account. Passwords need at least 8 characters.
- The exchange-rate lookup sends no amounts and no personal data. It is a plain request for the day's published rates.
- CSV export neutralises spreadsheet formulas (receipt text is untrusted), and the Firestore rules in [`web/firestore.rules`](web/firestore.rules) let each person read and write only their own items.
- Text on the palette meets WCAG contrast (navy on lavender 8.7:1, navy on yellow 8.5:1 or better), selected states do not rely on colour alone, and animation respects reduced-motion.
- Unit tests for the money, date, period, CSV, category, migration, reminder, validation and sync-merge logic (`npm test`).

## Not built yet (roadmap)

- Return deadlines read from printed return-policy text.
- Background reminders when the app is closed.
- An offline queue that refines receipts in the cloud later.
- Syncing receipt photos (they stay on the device on purpose).
- An Android version (a Jetpack Compose UI skeleton is in [`app/`](app/), parked).

## What this app does not do

- It does not give legal or tax advice.
- A warranty end date is only as good as the receipt. Always confirm with the seller or manufacturer.
- It does not guarantee the AI read is correct. You review every receipt before saving.

## Getting started

### Web app: `web/`
Built with Vite, React and TypeScript.

```
cd web
npm install
cp .env.example .env     # then fill in your Firebase web app keys
npm run dev              # http://localhost:5173
```

- **Without Firebase keys** the app still works in Manual mode. Auto (AI) is switched off with a notice.
- **With keys**, enable Firebase AI Logic in the Firebase console (Gemini Developer API), and use Web SDK v13 or newer.
- **On-device AI** runs only in **desktop Chrome 139+**. Turn on `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart Chrome, and the first scan downloads the model (this can take several minutes). In other browsers, or if the model is unavailable, the cloud is used and the badge says so.
- **App Check (required by Firebase AI Logic):** in `npm run dev` the first scan prints a debug token in the browser console. Register it in Firebase console, App Check, Apps, Manage debug tokens. For a hosted build, register the app with reCAPTCHA Enterprise (Fraud Defense) and set `VITE_RECAPTCHA_SITE_KEY`, or set `VITE_APPCHECK_DEBUG_TOKEN` to a token you registered, in `web/.env` before `npm run build`. Never commit these values.
- **Accounts and sync (optional):** in the Firebase console turn on **Authentication, Email/Password** and create a **Firestore database**. Then deploy the rules in `web/firestore.rules` with `firebase deploy --only firestore:rules` from `web/`. Without these the app works fully offline, and the account buttons explain what is missing.
- **Test accounts and sync without touching your real project:** the Firebase emulators can stand in for Authentication and Firestore (this also exercises the security rules). From `web/`, run `firebase emulators:start --only auth,firestore --project demo-instascan` in one terminal. In another, start the app with the emulator switch on, using made-up keys: set `VITE_USE_EMULATORS=true`, `VITE_FIREBASE_API_KEY=fake`, `VITE_FIREBASE_AUTH_DOMAIN=localhost`, `VITE_FIREBASE_PROJECT_ID=demo-instascan` and `VITE_FIREBASE_APP_ID=1:1:web:fake`, then run `npm run dev`. The switch only works in the dev server, never in a production build, and AI scanning is off in that mode (it needs the real project).
- **Tests:** `npm test` runs the logic tests, and `npx tsc --noEmit` type-checks.
- **Deploy:** `npm run build`, then `firebase deploy --only hosting` from `web/` (use `--only hosting,firestore:rules` to deploy the rules too). `web/.firebaserc` already points at the project.

### Android app: `app/`
A Jetpack Compose UI skeleton from the same wireframes (sign-in, drawer, scan form, warranty list, in-memory data, no AI yet). Open the folder in Android Studio and run the `app` configuration.

## Design

Draft wireframes live in [Draft Img](Draft%20Img/). The web app implements every page below (the drafts use the earlier working name InstaPay). Small additions: a Purchase date and Category on the form, a Warranty entry in the menu, and a Sync Settings page that covers accounts and the opt-in sync.

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

*The palette: `#f5e6e8`, `#d5c6e0`, `#aaa1c8`, `#967aa1` and `#192a51`, with yellow accents added in the web app.*

## Project docs
- [App Idea.md](App%20Idea.md): early build order and scope notes

## What was built during the submission period

The whole repository was created during the contest period (first commit 24 November 2026). Nothing here is pre-existing code. It was built with the help of an AI coding assistant (Claude Code), which the rules allow. The visual style borrows the shape language of the author's own earlier project, Project PaySense, but shares no code with it.

## License
Released under the [Apache License 2.0](LICENSE).

## Credits
- Web app logo: the pixel-art image at `web/public/logo.png`.
- Web UI icons (menu, camera, bell and so on) and the Android launcher icon: [Google Material Icons](https://github.com/google/material-design-icons), licensed under Apache 2.0.
- Font: [Nunito](https://fonts.google.com/specimen/Nunito) via `@fontsource-variable/nunito`, under the SIL Open Font License.
- Colour palette: see [Colour Scheme](Draft%20Img/Colour%20Scheme.png), with yellow accents added.
- Exchange rates: the European Central Bank's reference rates, served by the free, open [Frankfurter](https://frankfurter.dev) API.
- Built on Firebase AI Logic, React and Vite.
