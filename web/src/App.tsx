import { useCallback, useEffect, useRef, useState } from "react";
import { signOutAccount, watchAuth, type AuthUser } from "./core/auth";
import { dueReminders, toISODate } from "./core/deadlines";
import { isFirebaseConfigured } from "./core/firebase";
import { clearReceiptImages, deleteReceiptImage } from "./core/images";
import { hasWarranty, isOrphan } from "./core/items";
import {
  clearLocalData,
  clearSession,
  loadItems,
  loadSession,
  loadSettings,
  loadTombstones,
  markNotified,
  saveItems,
  saveSession,
  saveSettings,
  saveTombstones,
  wasNotifiedToday,
  type Session,
} from "./core/storage";
import type { Item, Settings } from "./core/types";
import { Icon } from "./components/Icon";
import { Brand } from "./components/Logo";
import type { IconName } from "./components/icons";
import { EditItemScreen } from "./screens/EditItemScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { ScanScreen } from "./screens/ScanScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { SubscriptionsScreen } from "./screens/SubscriptionsScreen";
import { SyncSettingsScreen, type SyncStatus } from "./screens/SyncSettingsScreen";
import { WarrantyScreen } from "./screens/WarrantyScreen";

type NavPage = "scan" | "warranty" | "subscriptions" | "expenses" | "sync";
type Page = NavPage | "edit";

const NAV: { page: NavPage; label: string; icon: IconName }[] = [
  { page: "scan", label: "Scan Receipt", icon: "receipt" },
  { page: "warranty", label: "Warranty", icon: "verified_user" },
  { page: "subscriptions", label: "Subscriptions Overview", icon: "subscriptions" },
  { page: "expenses", label: "Expenses Overview", icon: "assessment" },
  { page: "sync", label: "Sync Settings", icon: "sync" },
];

const SYNC_DELAY_MS = 1500;

function askForNotifications() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [items, setItems] = useState<Item[]>(loadItems);
  const [tombstones, setTombstones] = useState(loadTombstones);
  const [page, setPage] = useState<Page>("scan");
  const [editing, setEditing] = useState<{ id: string; back: NavPage } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sync, setSync] = useState<SyncStatus>({ state: "idle" });

  // Keep what is on screen and what is stored the same.
  useEffect(() => saveItems(items), [items]);
  useEffect(() => saveTombstones(tombstones), [tombstones]);
  useEffect(() => saveSettings(settings), [settings]);

  // Follow the signed-in account, if there is one.
  useEffect(
    () =>
      watchAuth((next) => {
        setUser(next);
        setAuthReady(true);
      }),
    [],
  );
  useEffect(() => {
    if (user) {
      saveSession("account");
      setSession("account");
    }
  }, [user]);

  // Browser notifications for reminders that are due, once per item per day, while the app is open.
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = toISODate(new Date());
    for (const { item, kind, daysLeft: left } of dueReminders(items)) {
      const key = `${item.id}:${kind}`;
      if (wasNotifiedToday(key, today)) continue;
      const when = left < 0 ? "is overdue" : left === 0 ? "is today" : `is in ${left} day${left === 1 ? "" : "s"}`;
      new Notification(kind === "warranty" ? `${item.name}: warranty ending soon` : `${item.name}: payment due`, {
        body: kind === "warranty" ? `The warranty ends ${when.replace("is ", "")}.` : `The next payment ${when}.`,
      });
      markNotified(key, today);
    }
  }, [items]);

  // ---- Optional cloud sync (opt-in, signed-in only) ----
  const latest = useRef({ items, tombstones });
  latest.current = { items, tombstones };
  const inFlight = useRef(false);
  const rerun = useRef(false);

  const runSync = useCallback(async () => {
    if (!user || !settings.syncEnabled) return;
    if (inFlight.current) {
      rerun.current = true;
      return;
    }
    inFlight.current = true;
    setSync((s) => ({ ...s, state: "syncing" }));
    try {
      const { syncItems } = await import("./core/sync");
      const result = await syncItems(user.uid, latest.current.items, latest.current.tombstones);
      // Only touch state when something really changed, so syncing settles instead of looping.
      if (result.localChanged) setItems(result.items);
      if (JSON.stringify(result.tombstones) !== JSON.stringify(latest.current.tombstones)) {
        setTombstones(result.tombstones);
      }
      setSync({ state: "ok", lastSynced: Date.now() });
    } catch (error) {
      const { describeSyncError } = await import("./core/sync");
      setSync({ state: "error", message: describeSyncError(error) });
    } finally {
      inFlight.current = false;
      if (rerun.current) {
        rerun.current = false;
        setTimeout(() => void runSync(), SYNC_DELAY_MS);
      }
    }
  }, [user, settings.syncEnabled]);

  useEffect(() => {
    if (!user || !settings.syncEnabled) return;
    const timer = setTimeout(() => void runSync(), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items, tombstones, user, settings.syncEnabled, runSync]);

  // Try again when the connection comes back.
  useEffect(() => {
    const retry = () => void runSync();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [runSync]);

  // ---- Changing items ----
  const patch = (id: string, change: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change, updatedAt: Date.now() } : i)));

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTombstones((prev) => ({ ...prev, [id]: Date.now() }));
    void deleteReceiptImage(id);
  }

  /** Clears one role of an item (expense, warranty or subscription). Deletes it if no role is left. */
  function dropRole(id: string, change: Partial<Item>) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (isOrphan({ ...item, ...change })) {
      const ok = window.confirm(
        `"${item.name}" is not an expense, warranty or subscription any more, so it would have nowhere to show. Delete it?`,
      );
      if (ok) deleteItem(id);
      return;
    }
    patch(id, change);
  }

  function goTo(next: NavPage) {
    setPage(next);
    setEditing(null);
    setMenuOpen(false);
  }

  function openEdit(id: string) {
    const back: NavPage = page === "edit" ? (editing?.back ?? "expenses") : page;
    setEditing({ id, back });
    setPage("edit");
  }

  function closeEdit() {
    setPage(editing?.back ?? "expenses");
    setEditing(null);
  }

  function addItem(item: Item) {
    setItems((prev) => [item, ...prev]);
    if (item.notify) askForNotifications();
    goTo(hasWarranty(item) ? "warranty" : item.isSubscription && !item.isExpense ? "subscriptions" : "expenses");
  }

  function saveEdit(item: Item) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    if (item.notify) askForNotifications();
    closeEdit();
  }

  function removeEdited(id: string) {
    deleteItem(id);
    closeEdit();
  }

  function toggleNotify(id: string) {
    const turningOn = !items.find((i) => i.id === id)?.notify;
    if (turningOn) askForNotifications();
    patch(id, { notify: turningOn });
  }

  // ---- Account and data ----
  async function signOut() {
    try {
      await signOutAccount();
    } catch {
      // Signing out locally still works if the network call fails.
    }
    clearSession();
    setSession(null);
    setSettings((s) => ({ ...s, syncEnabled: false }));
    goTo("scan");
  }

  function goToWelcome() {
    clearSession();
    setSession(null);
    setMenuOpen(false);
  }

  function deleteDeviceData() {
    clearLocalData();
    void clearReceiptImages();
    setItems([]);
    setTombstones({});
    // Otherwise sync would simply download everything again.
    setSettings((s) => ({ ...s, syncEnabled: false }));
  }

  async function deleteCloud() {
    if (!user) return;
    const { deleteCloudData } = await import("./core/sync");
    await deleteCloudData(user.uid);
    // Otherwise sync would simply upload everything again.
    setSettings((s) => ({ ...s, syncEnabled: false }));
  }

  // ---- What to show ----
  const entered = user !== null || session === "offline";
  if (!authReady && session === "account") {
    return (
      <div className="phone">
        <div className="empty-page" role="status">
          <p>Signing you in…</p>
        </div>
      </div>
    );
  }
  if (!entered) {
    return (
      <div className="phone">
        <SignInScreen
          onUseOffline={() => {
            saveSession("offline");
            setSession("offline");
          }}
        />
      </div>
    );
  }

  const editingItem = editing ? items.find((i) => i.id === editing.id) : undefined;
  const title = page === "edit" ? "Edit Item" : NAV.find((n) => n.page === page)!.label;

  return (
    <div className="phone">
      <header className="topbar">
        {page === "edit" ? (
          <button className="icon-btn" onClick={closeEdit} aria-label="Go back">
            <Icon name="arrow_back" />
          </button>
        ) : (
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">
            <Icon name="menu" />
          </button>
        )}
        <h1>{title}</h1>
      </header>

      <main>
        {page === "scan" && <ScanScreen defaultCurrency={settings.defaultCurrency} onAdd={addItem} />}
        {page === "warranty" && (
          <WarrantyScreen
            items={items}
            onEdit={openEdit}
            onRemove={(id) => dropRole(id, { endDate: "", activated: false })}
            onActivate={(id) => patch(id, { activated: true })}
            onToggleNotify={toggleNotify}
          />
        )}
        {page === "subscriptions" && (
          <SubscriptionsScreen
            items={items}
            onEdit={openEdit}
            onNotSubscription={(id) =>
              dropRole(id, { isSubscription: false, nextPayment: "", subscriptionActive: true })
            }
            onSetActive={(id, active) => patch(id, { subscriptionActive: active })}
          />
        )}
        {page === "expenses" && (
          <ExpensesScreen items={items} onEdit={openEdit} onNotExpense={(id) => dropRole(id, { isExpense: false })} />
        )}
        {page === "sync" && (
          <SyncSettingsScreen
            user={user}
            accountsAvailable={isFirebaseConfigured}
            settings={settings}
            onSettings={setSettings}
            status={sync}
            itemCount={items.length}
            onSyncNow={() => void runSync()}
            onDeleteCloud={deleteCloud}
            onDeleteDevice={deleteDeviceData}
            onSignOut={() => void signOut()}
            onGoSignIn={goToWelcome}
          />
        )}
        {page === "edit" &&
          (editingItem ? (
            <EditItemScreen
              key={editingItem.id}
              item={editingItem}
              defaultCurrency={settings.defaultCurrency}
              onSave={saveEdit}
              onDelete={removeEdited}
            />
          ) : (
            <div className="page">
              <p className="notice">This item no longer exists.</p>
            </div>
          ))}
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
                onClick={() => goTo(n.page)}
              >
                <Icon name={n.icon} /> {n.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="drawer-footer">
          <strong>Account:</strong>
          <div className="account-box">{user ? user.email : "Offline mode. Your receipts stay on this device."}</div>
          {user ? (
            <button className="btn btn-outline btn-block drawer-button" tabIndex={menuOpen ? 0 : -1} onClick={() => void signOut()}>
              <Icon name="exit_to_app" size={20} /> Sign out
            </button>
          ) : (
            isFirebaseConfigured && (
              <button className="btn btn-outline btn-block drawer-button" tabIndex={menuOpen ? 0 : -1} onClick={goToWelcome}>
                <Icon name="person" size={20} /> Sign in or register
              </button>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
