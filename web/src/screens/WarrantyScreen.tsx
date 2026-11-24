import { daysLeft, dueSoon, statusOf } from "../core/deadlines";
import type { WarrantyItem, WarrantyStatus } from "../core/types";
import { Icon } from "../components/Icon";
import { PathBadge } from "../components/PathBadge";

interface Props {
  items: WarrantyItem[];
  onRemove: (id: string) => void;
  onActivate: (id: string) => void;
  onToggleNotify: (id: string) => void;
}

const SECTIONS: { status: WarrantyStatus; title: string; subtitle: string }[] = [
  { status: "active", title: "Active", subtitle: "has not passed the expiration date" },
  { status: "inactive", title: "Inactive", subtitle: "passed the expiration date" },
  { status: "pending", title: "Pending", subtitle: "require activation" },
];

function countdown(item: WarrantyItem): string | null {
  const left = daysLeft(item.endDate);
  if (left === null) return null;
  if (left < 0) return `Expired ${-left} day${left === -1 ? "" : "s"} ago`;
  if (left === 0) return "Ends today";
  return `${left} day${left === 1 ? "" : "s"} left`;
}

/** Warranty page draft: Active (not expired), Inactive (expired), Pending (needs activation). */
export function WarrantyScreen({ items, onRemove, onActivate, onToggleNotify }: Props) {
  const due = dueSoon(items);

  return (
    <div className="page">
      {due.length > 0 && (
        <p className="notice" role="status">
          Expiring soon: {due.map((i) => `${i.name} (${countdown(i)})`).join(", ")}
        </p>
      )}

      {SECTIONS.map(({ status, title, subtitle }) => {
        const list = items.filter((i) => statusOf(i) === status);
        return (
          <section key={status} className="section">
            <h2 className="section-title">
              <u>{title}</u>: {subtitle}
            </h2>
            <ul className="card">
              {list.length === 0 && <li className="muted row-empty">Nothing here yet</li>}
              {list.map((item) => {
                const left = countdown(item);
                const details = [
                  item.endDate && `Ends ${item.endDate}`,
                  item.provider && `By ${item.provider}`,
                  item.amount,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={item.id} className="item">
                    <button className="icon-btn" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}>
                      <Icon name="close" />
                    </button>
                    <div className="item-main">
                      <strong>{item.name}</strong>
                      {details && <span className="muted">{details}</span>}
                      {left && status !== "pending" && <span className="countdown">{left}</span>}
                      <PathBadge source={item.source} reason={item.sourceReason} />
                    </div>
                    {status === "pending" ? (
                      <button
                        className="icon-btn"
                        onClick={() => onActivate(item.id)}
                        aria-label={`Add ${item.name} to active`}
                        title="Add to active"
                      >
                        <Icon name="hourglass_empty" />
                      </button>
                    ) : (
                      <button
                        className="icon-btn"
                        onClick={() => onToggleNotify(item.id)}
                        aria-pressed={item.notify}
                        aria-label={`${item.notify ? "Turn off" : "Turn on"} reminders for ${item.name}`}
                        title={item.notify ? "Reminders on" : "Reminders off"}
                      >
                        <Icon name={item.notify ? "notifications" : "notifications_off"} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
