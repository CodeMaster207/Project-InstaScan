/** Where a receipt's details came from. Shown as a badge in the UI. */
export type Source = "on-device" | "cloud" | "manual";

export type WarrantyStatus = "active" | "inactive" | "pending";

/**
 * One scanned (or hand-entered) purchase. The same record can be an expense, carry a warranty,
 * and be a subscription, matching the three views in the design drafts.
 */
export interface Item {
  id: string;
  name: string;
  /** Canonical display text such as "RM 12.50". Parsed with parseAmount() when summing. */
  amount: string;
  /**
   * Set only when the user chose to convert the amount into another currency when saving
   * (for example "USD 25.00" before it became "RM 102.27"). Kept so the original is never lost.
   */
  originalAmount?: string;
  /** Publication date of the exchange rate used for that conversion (YYYY-MM-DD). */
  rateDate?: string;
  /** Purchase date from the receipt (ISO YYYY-MM-DD), or "" when unknown. */
  purchaseDate: string;
  /** When the item was added (ISO YYYY-MM-DD). Used as the date when purchaseDate is empty. */
  addedAt: string;
  /** Epoch milliseconds of the last change. Used to merge changes between devices. */
  updatedAt: number;
  category: string;
  /** The store on the receipt. Information only, never assumed to be the warranty provider. */
  merchant: string;

  /** Counts in the Expenses page. */
  isExpense: boolean;

  // Warranty
  /** Warranty end date (ISO) or "". Items without one do not appear on the Warranty page. */
  endDate: string;
  provider: string;
  /** Pending until the user activates it. */
  activated: boolean;
  /** Reminder toggle (the bell). */
  notify: boolean;
  /** Days before a date to remind, or null for no reminder. */
  remindDays: number | null;

  // Subscription
  isSubscription: boolean;
  /** Active subscriptions are charged next cycle; inactive ones are not. */
  subscriptionActive: boolean;
  nextPayment: string;
  discountPercent: string;
  discountPeriod: string;

  source: Source;
  sourceReason?: string;
  /** True when a receipt photo is stored on this device (photos are never synced). */
  hasReceiptImage: boolean;
}

/** Fields the AI reads from a receipt photo. */
export interface ExtractedFields {
  itemName: string;
  merchant: string;
  /** YYYY-MM-DD */
  purchaseDate: string;
  total: number;
  currency: string;
  /** Only when a warranty length is printed on the receipt. */
  warrantyMonths?: number;
  policyText?: string;
  /** One of the known categories (see categories.ts). Unknown values become "Other". */
  category?: string;
  /** True only for a recurring subscription or membership. */
  isSubscription?: boolean;
}

export interface AiResult {
  fields: Partial<ExtractedFields>;
  source: Exclude<Source, "manual">;
  /** Why the app used the cloud, or why the result is what it is. */
  reason?: string;
  /** Set when even the final result is incomplete and needs the user's attention. */
  warning?: string;
}

export type AiStage = "preparing" | "device" | "cloud";

export interface Settings {
  /** Used when an amount is typed without a currency. */
  defaultCurrency: string;
  /**
   * Opt-in: the account (its uid) that chose to back up and sync its items, or null for nobody. Sync is
   * off until a person turns it on, and it only ever runs for the account that did, so someone else
   * signing in on the same device is never synced without agreeing themselves.
   */
  syncUid: string | null;
  /** Show totals in the default currency, converting other currencies at the latest ECB rate. */
  autoConvert: boolean;
}
