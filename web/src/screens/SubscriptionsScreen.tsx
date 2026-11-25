import { downloadText, toCSV } from "../core/csv";
import { daysLeft, dueReminders, toISODate } from "../core/deadlines";
import { formatMoney, itemMoney, sumByCurrency } from "../core/money";
import type { Item } from "../core/types";
import { Icon } from "../components/Icon";

interface Props {
  items: Item[];
  onEdit: (id: string) => void;
  /** Takes the item out of the subscriptions (it stays if it is also an expense or a warranty). */
  onNotSubscription: (id: string) => void;
  onSetActive: (id: string, active: boolean) => void;
}

function dueText(item: Item): string {
  if (!item.nextPayment) return "No next payment date";
  const left = daysLeft(item.nextPayment);
  const when =
    left === null ? "" : left < 0 ? `${-left} day${left === -1 ? "" : "s"} overdue` : left === 0 ? "today" : `in ${left} day${left === 1 ? "" : "s"}`;
  return `Next payment ${item.nextPayment}${when ? ` (${when})` : ""}`;
}

/** Subscriptions page draft: Active (charged next cycle) and Inactive (not charged next cycle). */
export function SubscriptionsScreen({ items, onEdit, onNotSubscription, onSetActive }: Props) {
  const subs = items.filter((i) => i.isSubscription);
  const active = subs.filter((i) => i.subscriptionActive);
  const inactive = subs.filter((i) => !i.subscriptionActive);
  const due = dueReminders(subs).filter((r) => r.kind === "subscription");
  const nextCycle = sumByCurrency(active);

  function exportCSV() {
    const rows = subs.map((item) => {
      const money = itemMoney(item);
      return [
        item.name,
        item.subscriptionActive ? "Active" : "Inactive",
        money ? money.value : "",
        money ? money.currency : "",
        item.nextPayment,
        item.discountPercent,
        item.discountPeriod,
      ];
    });
    const columns = ["Name", "Status", "Amount", "Currency", "Next payment", "Discount %", "Discount period"];
    downloadText(`instascan-subscriptions-${toISODate(new Date())}.csv`, toCSV(columns, rows));
  }

  function renderList(list: Item[], isActive: boolean) {
    return (
      <ul className="card">
        {list.length === 0 && <li className="muted row-empty">Nothing here yet</li>}
        {list.map((item) => (
          <li key={item.id} className="item">
            <button
              className="icon-btn"
              onClick={() => onNotSubscription(item.id)}
              aria-label={`${item.name} is not a subscription`}
              title="Not a subscription"
            >
              <Icon name="close" />
            </button>
            <div className="item-main">
              <strong>{item.name}</strong>
              <span className="muted">{dueText(item)}</span>
              {item.discountPercent && (
                <span className="muted">
                  Discount {item.discountPercent}%{item.discountPeriod ? ` (${item.discountPeriod})` : ""}
                </span>
              )}
            </div>
            <span className="amount">{item.amount}</span>
            <button className="icon-btn" onClick={() => onEdit(item.id)} aria-label={`Edit ${item.name}`} title="Edit">
              <Icon name="edit" />
            </button>
            <button
              className="icon-btn"
              onClick={() => onSetActive(item.id, !isActive)}
              aria-label={isActive ? `Make ${item.name} inactive` : `Make ${item.name} active`}
              title={isActive ? "Add to inactive" : "Add to active"}
            >
              <Icon name={isActive ? "pause_circle_outline" : "play_circle_outline"} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="page">
      {due.length > 0 && (
        <p className="notice" role="status">
          Payment coming up: {due.map((r) => `${r.item.name} (${dueText(r.item).replace("Next payment ", "")})`).join(", ")}
        </p>
      )}

      <section className="section">
        <h2 className="section-title">
          <u>Active Subscriptions</u>: Need to pay subscription fees next cycle
        </h2>
        {renderList(active, true)}
        {nextCycle.length > 0 && (
          <div className="total">
            <u>Due next cycle:</u>{" "}
            {nextCycle.map((t) => (
              <span key={t.currency} className="total-line">
                {formatMoney(t.total, t.currency)}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">
          <u>Inactive Subscriptions</u>: Will not need to pay subscription fees next cycle
        </h2>
        {renderList(inactive, false)}
      </section>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={exportCSV} disabled={subs.length === 0}>
          <Icon name="file_download" size={20} /> Print as CSV
        </button>
      </div>
    </div>
  );
}
