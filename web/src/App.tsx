import { useEffect, useState } from "react";
import { daysLeft, dueSoon, toISODate } from "./core/deadlines";
import { loadItems, loadSession, markNotified, saveItems, saveSession, wasNotifiedToday, type Session } from "./core/storage";
import type { WarrantyItem } from "./core/types";
import { Icon } from "./components/Icon";
import { Brand } from "./components/Logo";
import type { IconName } from "./components/icons";
import { ComingSoonScreen } from "./screens/ComingSoonScreen";
import { ScanScreen } from "./screens/ScanScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { WarrantyScreen } from "./screens/WarrantyScreen";

type Page = "scan" | "warranty" | "subscriptions" | "expenses" | "sync";

const NAV: { page: Page; label: string; icon: IconName }[] = [
  { page: "scan", label: "Scan Receipt", icon: "receipt" },
  { page: "warranty", label: "Warranty", icon: "verified_user" },
  { page: "subscriptions", label: "Subscriptions Overview", icon: "subscriptions" },
  { page: "expenses", label: "Expenses Overview", icon: "assessment" },
  { page: "sync", label: "Sync Settings", icon: "sync" },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [page, setPage] = useState<Page>("scan");
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<WarrantyItem[]>(loadItems);

  useEffect(() => saveItems(items), [items]);

  // Browser notification for reminders that are due, once per item per day, while the app is open.
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = toISODate(new Date());
    for (const item of dueSoon(items)) {
      if (wasNotifiedToday(item.id, today)) continue;
      const left = daysLeft(item.endDate);
      new Notification(`${item.name}: warranty ending soon`, {
        body: left === 0 ? "Ends today." : `${left} day${left === 1 ? "" : "s"} left.`,
      });
      markNotified(item.id, today);
    }
  }, [items]);

  function start(next: Session) {
    saveSession(next);
    setSession(next);
  }

  function addItem(item: WarrantyItem) {
    setItems((prev) => [item, ...prev]);
    if (item.notify && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    setPage("warranty");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function activate(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, activated: true } : i)));
  }

  function toggleNotify(id: string) {
    const turningOn = !items.find((i) => i.id === id)?.notify;
    if (turningOn && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notify: !i.notify } : i)));
  }

  if (!session) {
    return (
      <div className="phone">
        <SignInScreen onRegister={() => start("registered")} onUseOffline={() => start("offline")} />
      </div>
    );
  }

  const current = NAV.find((n) => n.page === page)!;

  return (
    <div className="phone">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">
          <Icon name="menu" />
        </button>
        <h1>{current.label}</h1>
      </header>

      <main>
        {page === "scan" && <ScanScreen onAdd={addItem} />}
        {page === "warranty" && (
          <WarrantyScreen items={items} onRemove={removeItem} onActivate={activate} onToggleNotify={toggleNotify} />
        )}
        {page !== "scan" && page !== "warranty" && <ComingSoonScreen title={current.label} />}
      </main>

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
      <nav className={menuOpen ? "drawer drawer-open" : "drawer"} aria-label="Main navigation" aria-hidden={!menuOpen}>
        <Brand size={56} />
        <ul>
          {NAV.map((n) => (
            <li key={n.page}>
              <button
                className={n.page === page ? "nav-item nav-on" : "nav-item"}
                aria-current={n.page === page ? "page" : undefined}
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => {
                  setPage(n.page);
                  setMenuOpen(false);
                }}
              >
                <Icon name={n.icon} /> {n.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="drawer-footer">
          <strong>Account:</strong>
          {/* TODO: show the signed-in email or username once registration exists. */}
          <div className="account-box">{session === "offline" ? "Offline mode" : "Email / Username"}</div>
        </div>
      </nav>
    </div>
  );
}
