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
- **Image input and structured output.** The receipt photo is sent as an inline image, and both paths are given the same response schema (`itemName`, `merchant`, `purchaseDate`, `total`, `currency`, optional `warrantyMonths` and `policyText`), so the answer is JSON, not free text.
- **The router.** After the on-device answer, [`web/src/core/validate.ts`](web/src/core/validate.ts) decides whether to keep it. Receipt dates such as `03/10/26 11:08` are normalised first ([`web/src/core/deadlines.ts`](web/src/core/deadlines.ts)), because small models often copy dates as printed.
- **Showing the path.** `result.response.inferenceSource` tells which path answered, and that drives the badge and the explanation on screen.
- **On-device model download.** `initializeDeviceModel` is called from the user's scan click, with progress shown.
- **App Check.** Firebase AI Logic requires it, so `initializeAppCheck` is set up before the first call (debug token in development, reCAPTCHA Enterprise or a registered debug token for a hosted build).

## Features (built)

- **Scan** with the camera or by uploading a photo (JPEG or PNG), in **Auto (AI)** or **Manual** mode.
- **Hybrid extraction** with on-device first and cloud fallback, a visible live status ("Reading on your device…", "Taking a closer look in the cloud…"), and the **On-device / Cloud / Manual** badge with the reason.
- **Review and edit** form: name, amount, warranty end date, who gives the warranty, subscription details and a reminder. Nothing is saved until you press **Add!**
- **No guessing:** a warranty end date is only worked out when a warranty length is printed on the receipt. The store name is shown as information and is not assumed to be the warranty provider.
- **Warranty page** with Active, Inactive and Pending lists, day countdowns, remove, and an activate button for pending items.
- **Reminders:** an "expiring soon" banner and browser notifications while the app is open.
- **Local storage:** everything stays in your browser. There is no account.
- **Accessible styling:** text on the palette meets WCAG contrast (navy on lavender 8.7:1, navy on yellow 10.8:1+), selected states do not rely on colour alone, and animation respects reduced-motion.

## Not built yet (roadmap)

- Return deadlines read from printed return-policy text.
- A dashboard ranked by urgency and price, and a "return proof" screen.
- Accounts and cloud sync (Firebase Authentication and Firestore).
- Subscriptions and expenses pages (they appear in the design drafts below).
- Background reminders when the app is closed, and an offline queue that refines receipts later.
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
- **Deploy:** `npm run build`, then `firebase deploy --only hosting` from `web/` (run `firebase init hosting` once and choose `dist` as the public folder).

### Android app: `app/`
A Jetpack Compose UI skeleton from the same wireframes (sign-in, drawer, scan form, warranty list, in-memory data, no AI yet). Open the folder in Android Studio and run the `app` configuration.

## Design

Draft wireframes live in [Draft Img](Draft%20Img/). They show the planned full app (the drafts use the earlier working name InstaPay). The hackathon build covers the scan and warranty flow, with a simplified welcome screen in place of sign-in.

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
- Built on Firebase AI Logic, React and Vite.
