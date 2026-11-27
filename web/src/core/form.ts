import { normalizeCategory } from "./categories";
import { parseISODate, toISODate } from "./deadlines";
import { normalizeAmount } from "./money";
import { convertAmountText, type RateTable } from "./rates";
import type { Item } from "./types";

/** What the details form edits. Dates are ISO (the date inputs produce that). */
export interface FormState {
  name: string;
  amount: string;
  /**
   * Currency to save the amount in, when the user chose to convert it ("" keeps the amount as it
   * is). Only used when the amount is in a different currency and exchange rates are available.
   */
  convertTo: string;
  purchaseDate: string;
  category: string;
  isExpense: boolean;
  isSubscription: boolean;
  /** Whether the warranty panel is shown. A hidden panel means the item has no warranty. */
  warrantyOpen: boolean;
  endDate: string;
  provider: string;
  nextPayment: string;
  discountPercent: string;
  discountStart: string;
  discountEnd: string;
  remind: boolean;
  remindDays: number;
}

export function emptyForm(now: Date = new Date()): FormState {
  return {
    name: "",
    amount: "",
    convertTo: "",
    purchaseDate: toISODate(now),
    category: "Other",
    isExpense: true,
    isSubscription: false,
    warrantyOpen: false,
    endDate: "",
    provider: "",
    nextPayment: "",
    discountPercent: "",
    discountStart: "",
    discountEnd: "",
    remind: false,
    remindDays: 7,
  };
}

/** Discount periods are stored as "2026-01-01 to 2026-03-01" ("?" marks a missing end). */
function splitPeriod(period: string): [string, string] {
  const match = /^(\S*) to (\S*)$/.exec(period);
  if (!match) return ["", ""];
  return [match[1] === "?" ? "" : match[1], match[2] === "?" ? "" : match[2]];
}

export function formFromItem(item: Item): FormState {
  const [discountStart, discountEnd] = splitPeriod(item.discountPeriod);
  return {
    name: item.name,
    amount: item.amount,
    convertTo: "",
    purchaseDate: item.purchaseDate,
    category: item.category,
    isExpense: item.isExpense,
    isSubscription: item.isSubscription,
    warrantyOpen: item.endDate !== "" || item.provider !== "",
    endDate: item.endDate,
    provider: item.provider,
    nextPayment: item.nextPayment,
    discountPercent: item.discountPercent,
    discountStart,
    discountEnd,
    remind: item.notify,
    remindDays: item.remindDays ?? 7,
  };
}

export type FormErrors = Partial<Record<"name" | "amount" | "purchaseDate" | "kind", string>>;

export function validateForm(form: FormState, defaultCurrency: string): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim() === "") errors.name = "Name is required";
  if (form.amount.trim() !== "" && normalizeAmount(form.amount, defaultCurrency) === null) {
    errors.amount = "Enter an amount like 12.50 or RM 12.50";
  }
  if (form.purchaseDate !== "" && !parseISODate(form.purchaseDate)) errors.purchaseDate = "Use a real date";
  const hasWarranty = form.warrantyOpen && form.endDate !== "";
  if (!form.isExpense && !form.isSubscription && !hasWarranty) {
    errors.kind = "Tick Expense or Subscription, or add a warranty end date, so this item has somewhere to show.";
  }
  return errors;
}

/**
 * Copies the form onto an item. `base` is the existing item, or a fresh one for a new scan.
 *
 * If the user chose to convert the amount, the saved amount is the converted one, and the original is
 * kept (with the rate's date) so nothing is lost. If they kept it, the amount is saved as it is.
 */
export function applyForm(
  form: FormState,
  base: Item,
  defaultCurrency: string,
  rates: RateTable | null,
  now: Date = new Date(),
): Item {
  const typed = normalizeAmount(form.amount, defaultCurrency);
  let amount = typed ?? base.amount;
  let originalAmount: string | undefined;
  let rateDate: string | undefined;

  const converted =
    form.convertTo && rates && form.amount.trim() !== ""
      ? convertAmountText(form.amount, defaultCurrency, form.convertTo, rates)
      : null;
  if (converted && rates) {
    amount = converted.amount;
    originalAmount = converted.original;
    rateDate = rates.date;
  } else if (typed !== null && typed === base.amount) {
    // The amount was not touched, so any earlier conversion note still applies.
    originalAmount = base.originalAmount;
    rateDate = base.rateDate;
  }

  const discountPeriod =
    form.isSubscription && (form.discountStart || form.discountEnd)
      ? `${form.discountStart || "?"} to ${form.discountEnd || "?"}`
      : "";
  return {
    ...base,
    name: form.name.trim(),
    amount,
    originalAmount,
    rateDate,
    purchaseDate: form.purchaseDate,
    category: normalizeCategory(form.category),
    isExpense: form.isExpense,
    isSubscription: form.isSubscription,
    // A hidden warranty panel means no warranty, whatever was typed in it before.
    endDate: form.warrantyOpen ? form.endDate : "",
    provider: form.warrantyOpen ? form.provider.trim() : "",
    nextPayment: form.isSubscription ? form.nextPayment : "",
    discountPercent: form.isSubscription ? form.discountPercent.trim() : "",
    discountPeriod,
    notify: form.remind,
    remindDays: form.remind ? form.remindDays : null,
    updatedAt: now.getTime(),
  };
}
