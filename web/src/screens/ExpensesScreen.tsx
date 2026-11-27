import { useMemo, useState } from "react";
import { downloadText, toCSV } from "../core/csv";
import { toISODate } from "../core/deadlines";
import { formatMoney, itemMoney, sumByCurrency } from "../core/money";
import { inPeriod, PERIODS, periodLabel, type Period } from "../core/periods";
import { approxText, convert, totalIn, type Converter } from "../core/rates";
import type { Item } from "../core/types";
import { Icon } from "../components/Icon";
import { PieChart } from "../components/PieChart";

interface Props {
  items: Item[];
  /** Converts everything into the default currency. Null when conversion is off or rates are missing. */
  converter: Converter | null;
  /** True when the user wants conversion but rates have not been downloaded yet. */
  ratesMissing: boolean;
  onEdit: (id: string) => void;
  /** Takes the item out of the expenses (it stays if it is also a warranty or subscription). */
  onNotExpense: (id: string) => void;
}

const dateOf = (item: Item) => item.purchaseDate || item.addedAt;

/** Expenses page draft: filter by period, see the total, a category chart, and export to CSV. */
export function ExpensesScreen({ items, converter, ratesMissing, onEdit, onNotExpense }: Props) {
  const [period, setPeriod] = useState<Period>("all");
  const [chartCurrency, setChartCurrency] = useState<string | null>(null);

  const expenses = useMemo(
    () =>
      items
        .filter((i) => i.isExpense && inPeriod(dateOf(i), period))
        .sort((a, b) => dateOf(b).localeCompare(dateOf(a))),
    [items, period],
  );

  // Without conversion, each currency is totalled separately and never added to another.
  const totals = sumByCurrency(expenses);
  const activeCurrency = totals.find((t) => t.currency === chartCurrency)?.currency ?? totals[0]?.currency ?? "";
  const converted = converter ? totalIn(expenses, converter) : null;

  const slices = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of expenses) {
      const money = itemMoney(item);
      if (!money) continue;
      let value: number | null;
      if (converter) value = convert(money.value, money.currency, converter.base, converter.table);
      else value = money.currency === activeCurrency ? money.value : null;
      if (value === null) continue;
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + value);
    }
    return [...byCategory.entries()].map(([label, value]) => ({ label, value }));
  }, [expenses, activeCurrency, converter]);

  const chartLabel = converter ? converter.base : activeCurrency;

  function exportCSV() {
    const rows = expenses.map((item) => {
      const money = itemMoney(item);
      const inBase = money && converter ? convert(money.value, money.currency, converter.base, converter.table) : null;
      return [
        dateOf(item),
        item.name,
        item.merchant,
        item.category,
        money ? money.value : "",
        money ? money.currency : "",
        inBase === null ? "" : Math.round(inBase * 100) / 100,
        inBase === null || !converter ? "" : converter.base,
        item.endDate,
        item.isSubscription ? "Yes" : "No",
      ];
    });
    const columns = [
      "Date",
      "Name",
      "Merchant",
      "Category",
      "Amount",
      "Currency",
      "Converted amount",
      "Converted currency",
      "Warranty ends",
      "Subscription",
    ];
    downloadText(`instascan-expenses-${period}-${toISODate(new Date())}.csv`, toCSV(columns, rows));
  }

  return (
    <div className="page">
      <div className="segmented segmented-wide" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            className={period === p.id ? "seg seg-on" : "seg"}
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <h2 className="section-title period-title">
        <u>{periodLabel(period)}</u>
      </h2>

      <ul className="card">
        {expenses.length === 0 && (
          <li className="muted row-empty">
            No expenses in this period.{period !== "all" && " Try All to see everything."}
          </li>
        )}
        {expenses.map((item) => {
          const approx = approxText(item, converter);
          return (
            <li key={item.id} className="item">
              <button
                className="icon-btn"
                onClick={() => onNotExpense(item.id)}
                aria-label={`${item.name} is not an expense`}
                title="Not an expense"
              >
                <Icon name="close" />
              </button>
              <div className="item-main">
                <strong>{item.name}</strong>
                <span className="muted">{[dateOf(item), item.category].filter(Boolean).join(" · ")}</span>
              </div>
              <span className="amount">
                {item.amount || "No amount"}
                {approx && <small className="approx">{approx}</small>}
                {item.originalAmount && <small className="approx">was {item.originalAmount}</small>}
              </span>
              <button
                className="icon-btn"
                onClick={() => onEdit(item.id)}
                aria-label={`Edit ${item.name}`}
                title="Edit"
              >
                <Icon name="edit" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="total" aria-live="polite">
        <u>Total Spent:</u>{" "}
        {converter && converted ? (
          <span className="total-line">{formatMoney(converted.total, converter.base)}</span>
        ) : totals.length === 0 ? (
          <span>{formatMoney(0, "")}</span>
        ) : (
          totals.map((t) => (
            <span key={t.currency}>
              <span className="total-line">{formatMoney(t.total, t.currency)}</span>{" "}
            </span>
          ))
        )}
      </div>

      {converter && converted && converted.converted > 0 && (
        <p className="muted conversion-note">
          Includes {converted.converted} item{converted.converted === 1 ? "" : "s"} converted at the{" "}
          {converter.table.date} European Central Bank rate.
        </p>
      )}
      {converter && converted && converted.skipped.length > 0 && (
        <p className="muted conversion-note" role="status">
          {converted.skipped.length} item{converted.skipped.length === 1 ? "" : "s"} could not be converted and{" "}
          {converted.skipped.length === 1 ? "is" : "are"} left out of the total:{" "}
          {converted.skipped.map((i) => i.name).join(", ")}.
        </p>
      )}
      {!converter && ratesMissing && totals.length > 1 && (
        <p className="muted conversion-note" role="status">
          Exchange rates are not available yet, so each currency is shown separately.
        </p>
      )}

      <section className="chart-card" aria-label="Spending by category">
        <h3>Spending by category{converter ? ` (in ${converter.base === "MYR" ? "RM" : converter.base})` : ""}</h3>
        {!converter && totals.length > 1 && (
          <label className="field field-inline">
            <span>Currency</span>
            <select value={activeCurrency} onChange={(e) => setChartCurrency(e.target.value)}>
              {totals.map((t) => (
                <option key={t.currency} value={t.currency}>
                  {t.currency === "MYR" ? "RM" : t.currency || "No currency"}
                </option>
              ))}
            </select>
          </label>
        )}
        <PieChart slices={slices} formatValue={(v) => formatMoney(v, chartLabel)} />
      </section>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={exportCSV} disabled={expenses.length === 0}>
          <Icon name="file_download" size={20} /> Print as CSV
        </button>
      </div>
    </div>
  );
}
