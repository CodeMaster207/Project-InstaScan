import type { ReactNode } from "react";
import { CATEGORIES, normalizeCategory } from "../core/categories";
import { parseISODate, toISODate } from "../core/deadlines";
import { normalizeAmount } from "../core/money";
import type { Item } from "../core/types";

export const REMIND_OPTIONS = [1, 3, 7, 14, 30];

/** What the form edits. Dates are ISO (the date inputs produce that). */
export interface FormState {
  name: string;
  amount: string;
  purchaseDate: string;
  category: string;
  isExpense: boolean;
  isSubscription: boolean;
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
    purchaseDate: toISODate(now),
    category: "Other",
    isExpense: true,
    isSubscription: false,
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
    purchaseDate: item.purchaseDate,
    category: item.category,
    isExpense: item.isExpense,
    isSubscription: item.isSubscription,
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
  if (!form.isExpense && !form.isSubscription && form.endDate === "") {
    errors.kind = "Tick Expense or Subscription, or add a warranty end date, so this item has somewhere to show.";
  }
  return errors;
}

/** Copies the form onto an item. `base` is the existing item, or a fresh one for a new scan. */
export function applyForm(form: FormState, base: Item, defaultCurrency: string, now: Date = new Date()): Item {
  const discountPeriod =
    form.isSubscription && (form.discountStart || form.discountEnd)
      ? `${form.discountStart || "?"} to ${form.discountEnd || "?"}`
      : "";
  return {
    ...base,
    name: form.name.trim(),
    amount: normalizeAmount(form.amount, defaultCurrency) ?? base.amount,
    purchaseDate: form.purchaseDate,
    category: normalizeCategory(form.category),
    isExpense: form.isExpense,
    isSubscription: form.isSubscription,
    endDate: form.endDate,
    provider: form.provider.trim(),
    nextPayment: form.isSubscription ? form.nextPayment : "",
    discountPercent: form.isSubscription ? form.discountPercent.trim() : "",
    discountPeriod,
    notify: form.remind,
    remindDays: form.remind ? form.remindDays : null,
    updatedAt: now.getTime(),
  };
}

interface Props {
  form: FormState;
  onChange: (next: FormState) => void;
  errors: FormErrors;
  onSubmit: () => void;
  submitLabel: string;
  /** Extra controls shown next to the submit button (for example Delete). */
  extraActions?: ReactNode;
}

/** The details form from the design drafts, shared by the Scan and Edit pages. */
export function ItemForm({ form, onChange, errors, onSubmit, submitLabel, extraActions }: Props) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => onChange({ ...form, [key]: value });

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="field">
        <span>Name</span>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Expense name"
          aria-invalid={errors.name !== undefined}
        />
        {errors.name && <small className="error">{errors.name}</small>}
      </label>

      <div className="row row-amount">
        <label className="field">
          <span>Amount</span>
          <input
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="Money"
            inputMode="decimal"
            aria-invalid={errors.amount !== undefined}
          />
          {errors.amount && <small className="error">{errors.amount}</small>}
        </label>
        <div className="checks" role="group" aria-label="What this is">
          <label className="check">
            <input type="checkbox" checked={form.isExpense} onChange={(e) => set("isExpense", e.target.checked)} />
            <span>Expense</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.isSubscription}
              onChange={(e) => set("isSubscription", e.target.checked)}
            />
            <span>Subscription</span>
          </label>
        </div>
      </div>
      {errors.kind && (
        <small className="error" role="alert">
          {errors.kind}
        </small>
      )}

      <div className="row">
        <label className="field">
          <span>Purchase date</span>
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
            aria-invalid={errors.purchaseDate !== undefined}
          />
          {errors.purchaseDate && <small className="error">{errors.purchaseDate}</small>}
        </label>
        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Warranty details</legend>
        <p className="muted">How long does it last</p>
        <div className="row">
          <label className="field">
            <span>End date</span>
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </label>
          <label className="field">
            <span>By</span>
            <input
              value={form.provider}
              onChange={(e) => set("provider", e.target.value)}
              placeholder="Seller / Manufacturer"
            />
          </label>
        </div>
      </fieldset>

      {form.isSubscription && (
        <fieldset>
          <legend>Subscription details</legend>
          <p className="muted">The next cycle will start at when</p>
          <div className="row">
            <label className="field">
              <span>Next payment at</span>
              <input type="date" value={form.nextPayment} onChange={(e) => set("nextPayment", e.target.value)} />
            </label>
            <label className="field">
              <span>Any discount given</span>
              <input
                inputMode="decimal"
                value={form.discountPercent}
                onChange={(e) => set("discountPercent", e.target.value)}
                placeholder="%"
              />
            </label>
          </div>
          <div className="row">
            <label className="field">
              <span>Discount valid from</span>
              <input type="date" value={form.discountStart} onChange={(e) => set("discountStart", e.target.value)} />
            </label>
            <label className="field">
              <span>Discount valid until</span>
              <input type="date" value={form.discountEnd} onChange={(e) => set("discountEnd", e.target.value)} />
            </label>
          </div>
        </fieldset>
      )}

      <label className="check">
        <input type="checkbox" checked={form.remind} onChange={(e) => set("remind", e.target.checked)} />
        <strong>Remind me when</strong>
      </label>
      {form.remind && (
        <label className="field">
          <span>Days before the end date or next payment</span>
          <select value={form.remindDays} onChange={(e) => set("remindDays", Number(e.target.value))}>
            {REMIND_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="form-actions">
        {extraActions}
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
