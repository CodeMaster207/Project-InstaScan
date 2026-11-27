# Sample receipts

Fake receipts for trying InstaScan and for the demo video. **Everything on them is made up**: the shops, addresses, phone numbers, invoice numbers and amounts. Any resemblance to a real business is a coincidence.

Upload them in **Scan Receipt, Auto (AI)** with **Upload photo**.

| File | What it is | What to expect |
|---|---|---|
| `01-electronics-with-warranty.png` | Clean printed receipt, day/month/year date, "WARRANTY: 1 YEAR" printed | Item: rice cooker. Date 2026-11-23. The warranty end date is worked out as 1 year later. Category: Electronics. |
| `02-groceries-no-warranty.png` | Clean printed supermarket receipt | Total RM 42.85. No warranty length is printed, so the end date stays blank. Category: Groceries. |
| `03-subscription-gym.png` | Monthly gym membership, mentions auto-renewal | Should be marked as a subscription, RM 80.00. The next billing date (24/12/26) is printed, but the app does not read it, so you type it in. A good "review before saving" moment. |
| `04-crumpled-faded-headphones.png` | Crumpled, tilted, faded photo, in US dollars, with a 2-year warranty | A harder read. Good for showing the **Cloud** badge if the on-device model rejects it. |
| `05-usd-coffee-clean.png` | Clean receipt in US dollars, ISO date | Shows two currencies in Expenses (they are totalled separately). Category: Food & drink. |
| `06-handwritten-phone-case.png` | Handwritten receipt on lined paper, dotted date `20.11.26` | Another hard one. Total RM 47.00. |

## Using them in the demo

- **On-device badge:** `01` or `02` are the most likely to stay on-device.
- **Cloud badge:** try `04` or `06`. Whether the on-device model rejects them depends on your Chrome and model version, so test first and keep whichever one escalates for you.
- **Two currencies:** scan `01` and `05`, then open Expenses Overview.
- **Subscriptions page:** scan `03`.

Results come from an AI model, so a field may occasionally be wrong. That is why every receipt is reviewed before it is saved.
