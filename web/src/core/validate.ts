import { parseISODate } from "./deadlines";
import type { ExtractedFields } from "./types";

/**
 * The routing rule: returns a human-readable reason when an on-device result is not
 * trustworthy enough to keep, or null when it is good. A rejected result is retried in the cloud.
 */
export function rejectReason(fields: Partial<ExtractedFields> | null): string | null {
  if (!fields) return "the answer could not be read";
  if (!fields.merchant?.trim() && !fields.itemName?.trim()) return "no merchant or item name found";
  if (!fields.purchaseDate || !parseISODate(fields.purchaseDate)) return "no valid purchase date";
  if (typeof fields.total !== "number" || !Number.isFinite(fields.total) || fields.total <= 0) {
    return "no valid total";
  }
  return null;
}
