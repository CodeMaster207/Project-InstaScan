export const CATEGORIES = [
  "Groceries",
  "Food & drink",
  "Shopping",
  "Electronics",
  "Transport",
  "Health",
  "Bills & subscriptions",
  "Entertainment",
  "Other",
] as const;

/** Maps whatever the AI wrote to one of the known categories, or "Other". */
export function normalizeCategory(raw: string | undefined | null): string {
  const text = (raw ?? "").trim().toLowerCase().replace(/\s+and\s+/g, " & ");
  if (!text) return "Other";
  const exact = CATEGORIES.find((c) => c.toLowerCase() === text);
  if (exact) return exact;
  const loose = CATEGORIES.find((c) => c !== "Other" && (text.includes(c.toLowerCase()) || c.toLowerCase().includes(text)));
  return loose ?? "Other";
}
