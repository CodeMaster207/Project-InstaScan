import type { ReactNode } from "react";
import { CATEGORIES } from "../core/categories";
import type { FormErrors, FormState } from "../core/form";
import type { RateTable } from "../core/rates";
import { CurrencyChoice } from "./CurrencyChoice";
import { DateField } from "./DateField";
import { Icon } from "./Icon";

export const REMIND_OPTIONS = [1, 3, 7, 14, 30];

interface Props {
  form: FormState;
  onChange: (next: FormState) => void;
  errors: FormErrors;
  onSubmit: () => void;
  submitLabel: string;
  /** The user's default currency, for example "RM". */
  defaultCurrency: string;
  /** Exchange rates for the "keep or convert" choice. Null when none have been downloaded. */
  rates: RateTable | null;
  /** Extra controls shown next to the submit button (for example Delete). */
  extraActions?: ReactNode;
  /** A note under the Amount field, for example where a converted amount came from. */
  amountNote?: string | null;
}

/** The details form from the design drafts, shared by the Scan and Edit pages. */
export function ItemForm({
  form,
  onChange,
  errors,
  onSubmit,
  submitLabel,
  defaultCurrency,
  rates,
  extraActions,
  amountNote,
}: Props) {
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
          {!errors.amount && amountNote && <small className="hint">{amountNote}</small>}
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

      {!errors.amount && (
        <CurrencyChoice
          amountText={form.amount}
          defaultCurrency={defaultCurrency}
          rates={rates}
          convertTo={form.convertTo}
          onChange={(convertTo) => set("convertTo", convertTo)}
        />
      )}

      <div className="row">
        <DateField
          label="Purchase date"
          value={form.purchaseDate}
          onChange={(value) => set("purchaseDate", value)}
          error={errors.purchaseDate}
        />
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

      {form.warrantyOpen ? (
        <fieldset className="warranty-panel">
          <legend>Warranty details</legend>
          <button
            type="button"
            className="btn btn-small btn-outline panel-remove"
            onClick={() => onChange({ ...form, warrantyOpen: false, endDate: "", provider: "" })}
            title="This item has no warranty"
          >
            <Icon name="close" size={18} /> Remove warranty
          </button>
          <p className="muted">How long does it last</p>
          <div className="row">
            <DateField
              label="End date"
              value={form.endDate}
              onChange={(value) => set("endDate", value)}
              clearable
            />
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
      ) : (
        <button type="button" className="btn btn-outline btn-block" onClick={() => set("warrantyOpen", true)}>
          <Icon name="add" size={20} /> Add a warranty
        </button>
      )}

      {form.isSubscription && (
        <fieldset>
          <legend>Subscription details</legend>
          <p className="muted">The next cycle will start at when</p>
          <div className="row">
            <DateField
              label="Next payment at"
              value={form.nextPayment}
              onChange={(value) => set("nextPayment", value)}
              clearable
            />
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
            <DateField
              label="Discount valid from"
              value={form.discountStart}
              onChange={(value) => set("discountStart", value)}
              clearable
            />
            <DateField
              label="Discount valid until"
              value={form.discountEnd}
              onChange={(value) => set("discountEnd", value)}
              clearable
            />
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
