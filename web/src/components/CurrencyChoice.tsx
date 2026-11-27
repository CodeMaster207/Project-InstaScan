import { currencyKey, formatMoney, parseAmount } from "../core/money";
import { canConvert, convertAmountText, convertibleCurrencies, type RateTable } from "../core/rates";

interface Props {
  /** What is typed in the Amount field (or read from the receipt). */
  amountText: string;
  /** The user's default currency, for example "RM". */
  defaultCurrency: string;
  rates: RateTable | null;
  /** "" keeps the amount as it is, otherwise the currency to save it in. */
  convertTo: string;
  onChange: (convertTo: string) => void;
}

const niceName = (code: string) => (code === "MYR" ? "RM (MYR)" : code);

/**
 * Shown when the amount is in a currency other than the user's default (for example a receipt
 * read as USD). The user decides: keep it as it is, or save it in another currency. Nothing is
 * converted unless they choose to, and the original amount is always kept.
 */
export function CurrencyChoice({ amountText, defaultCurrency, rates, convertTo, onChange }: Props) {
  const base = currencyKey(defaultCurrency);
  const money = parseAmount(amountText, defaultCurrency);
  if (!money || money.currency === base) return null;

  const from = money.currency;
  const original = formatMoney(money.value, from);

  if (!rates) {
    return (
      <p className="currency-choice currency-note" role="status">
        This amount is in {niceName(from)}. Exchange rates are not available right now, so it will be saved as{" "}
        <strong>{original}</strong>.
      </p>
    );
  }
  if (!canConvert(from, base, rates)) {
    return (
      <p className="currency-choice currency-note" role="status">
        There is no exchange rate between {niceName(from)} and {niceName(base)}, so this will be saved as{" "}
        <strong>{original}</strong>.
      </p>
    );
  }

  const converting = convertTo !== "" && convertTo !== from;
  const target = converting ? convertTo : base;
  const options = [base, ...convertibleCurrencies(rates).filter((c) => c !== base)].filter((c) => c !== from);
  const preview = converting ? convertAmountText(amountText, defaultCurrency, target, rates) : null;

  return (
    <fieldset className="currency-choice">
      <legend>This amount is in {niceName(from)}. What should be saved?</legend>
      <label className="radio">
        <input type="radio" name="currency-choice" checked={!converting} onChange={() => onChange("")} />
        <span>
          Keep <strong>{original}</strong>
        </span>
      </label>
      <label className="radio">
        <input type="radio" name="currency-choice" checked={converting} onChange={() => onChange(options[0] ?? "")} />
        <span>Convert to</span>
        <select
          aria-label="Currency to convert to"
          value={target}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => !converting && onChange(options[0] ?? "")}
        >
          {options.map((code) => (
            <option key={code} value={code}>
              {niceName(code)}
            </option>
          ))}
        </select>
      </label>
      {preview && (
        <p className="hint" aria-live="polite">
          Will be saved as <strong>{preview.amount}</strong> at the {rates.date} European Central Bank rate. The
          original {preview.original} is kept with the item.
        </p>
      )}
    </fieldset>
  );
}
