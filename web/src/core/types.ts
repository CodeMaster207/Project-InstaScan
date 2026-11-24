/** Where a receipt's details came from. Shown as a badge in the UI. */
export type Source = "on-device" | "cloud" | "manual";

export type WarrantyStatus = "active" | "inactive" | "pending";

export interface WarrantyItem {
  id: string;
  name: string;
  amount: string;
  /** ISO date (YYYY-MM-DD) or empty when unknown. */
  endDate: string;
  provider: string;
  nextPayment: string;
  discountPercent: string;
  discountPeriod: string;
  /** Days before the end date to remind, or null for no reminder. */
  remindDays: number | null;
  /** Pending until the user activates it. */
  activated: boolean;
  /** Reminder toggle (the bell on the warranty page). */
  notify: boolean;
  source: Source;
  sourceReason?: string;
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
