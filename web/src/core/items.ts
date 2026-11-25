import { normalizeCategory } from "./categories";
import { toISODate } from "./deadlines";
import type { Item, Source } from "./types";

/** A complete Item with safe defaults. Callers override what they know. */
export function makeItem(partial: Partial<Item> & Pick<Item, "name">, now: Date = new Date()): Item {
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name,
    amount: partial.amount ?? "",
    purchaseDate: partial.purchaseDate ?? "",
    addedAt: partial.addedAt ?? toISODate(now),
    updatedAt: partial.updatedAt ?? now.getTime(),
    category: normalizeCategory(partial.category),
    merchant: partial.merchant ?? "",
    isExpense: partial.isExpense ?? true,
    endDate: partial.endDate ?? "",
    provider: partial.provider ?? "",
    activated: partial.activated ?? false,
    notify: partial.notify ?? false,
    remindDays: partial.remindDays ?? null,
    isSubscription: partial.isSubscription ?? false,
    subscriptionActive: partial.subscriptionActive ?? true,
    nextPayment: partial.nextPayment ?? "",
    discountPercent: partial.discountPercent ?? "",
    discountPeriod: partial.discountPeriod ?? "",
    source: partial.source ?? "manual",
    sourceReason: partial.sourceReason,
    hasReceiptImage: partial.hasReceiptImage ?? false,
  };
}

const SOURCES: Source[] = ["on-device", "cloud", "manual"];

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Reads an item from storage or from the cloud. Accepts the first version of the app's items
 * (which had fewer fields) and fills in what is missing. Returns null for unusable data.
 */
export function migrateItem(raw: unknown, now: Date = new Date()): Item | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name).trim();
  const id = str(r.id);
  if (!name || !id) return null;

  const remind = typeof r.remindDays === "number" && Number.isFinite(r.remindDays) ? r.remindDays : null;
  const nextPayment = str(r.nextPayment);
  const source = SOURCES.includes(r.source as Source) ? (r.source as Source) : "manual";

  return makeItem(
    {
      id,
      name,
      amount: str(r.amount),
      purchaseDate: str(r.purchaseDate),
      addedAt: str(r.addedAt) || toISODate(now),
      updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : now.getTime(),
      category: str(r.category),
      merchant: str(r.merchant),
      isExpense: typeof r.isExpense === "boolean" ? r.isExpense : true,
      endDate: str(r.endDate),
      provider: str(r.provider),
      activated: r.activated === true,
      notify: r.notify === true,
      remindDays: remind,
      // Items saved by the first version had no subscription flag: a next payment date implies one.
      isSubscription: typeof r.isSubscription === "boolean" ? r.isSubscription : nextPayment !== "",
      subscriptionActive: typeof r.subscriptionActive === "boolean" ? r.subscriptionActive : true,
      nextPayment,
      discountPercent: str(r.discountPercent),
      discountPeriod: str(r.discountPeriod),
      source,
      sourceReason: typeof r.sourceReason === "string" ? r.sourceReason : undefined,
      hasReceiptImage: r.hasReceiptImage === true,
    },
    now,
  );
}

/** True when the item belongs on the Warranty page. */
export function hasWarranty(item: Pick<Item, "endDate">): boolean {
  return item.endDate !== "";
}

/** An item that is no longer an expense, a warranty or a subscription has no page left to live on. */
export function isOrphan(item: Pick<Item, "isExpense" | "isSubscription" | "endDate">): boolean {
  return !item.isExpense && !item.isSubscription && !hasWarranty(item);
}
