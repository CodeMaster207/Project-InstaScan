import { useCallback, useEffect, useRef, useState } from "react";
import { signOutAccount, watchAuth, type AuthUser } from "./core/auth";
import { dueReminders, toISODate } from "./core/deadlines";
import { isFirebaseConfigured } from "./core/firebase";
import { clearReceiptImages, deleteReceiptImage } from "./core/images";
import { hasWarranty, isOrphan } from "./core/items";
import { currencyKey } from "./core/money";
import { fetchRates, isFresh, type Converter, type RateTable } from "./core/rates";
import {
  deleteQuestion,
  deleteReachesBackup,
  describeDiscovery,
  findNewItems,
  type Discovery,
} from "./core/policy";
import { isSyncOn } from "./core/settings";
import {
  clearLocalData,
  clearSession,
  loadItems,
  loadOwner,
  loadPromptHidden,
  savePromptHidden,
  loadRates,
  loadSession,
  loadSettings,
  loadTombstones,
  markNotified,
  saveItems,
  saveOwner,
  saveRates,
  saveSession,
  saveSettings,
  saveTombstones,
  wasNotifiedToday,
  type Session,
} from "./core/storage";
import type { Item, Settings } from "./core/types";
import { Icon } from "./components/Icon";
import { Brand } from "./components/Logo";
import { DiscoveryDialog } from "./components/DiscoveryDialog";
import { SyncPrompt } from "./components/SyncPrompt";
import type { IconName } from "./components/icons";
import { EditItemScreen } from "./screens/EditItemScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { ScanScreen } from "./screens/ScanScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { SubscriptionsScreen } from "./screens/SubscriptionsScreen";
import { SyncSettingsScreen, type RatesInfo, type SyncStatus } from "./screens/SyncSettingsScreen";
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
/** If the cloud has not answered by then, stop waiting and say so, instead of showing "Syncing…" forever. */
const SYNC_TIMEOUT_MS = 20_000;

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
  const [toast, setToast] = useState<string | null>(null);
  const [promptHidden, setPromptHidden] = useState(loadPromptHidden);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const [rates, setRates] = useState<RateTable | null>(loadRates);
  const [ratesStatus, setRatesStatus] = useState<RatesInfo["status"]>("idle");

  const entered = user !== null || session === "offline";

  // ---- Automatic currency conversion ----
  const refreshRates = useCallback(async () => {
    setRatesStatus("loading");
    try {
      const table = await fetchRates();
      setRates(table);
      saveRates(table);
      setRatesStatus("idle");
    } catch {
      // Keep whatever rates are cached. Totals fall back to one line per currency if there are none.
      setRatesStatus("error");
    }
  }, []);

  // Download rates when the app opens (and when the connection returns) if the cached ones are old.
  useEffect(() => {
    if (!settings.autoConvert || !entered || isFresh(rates)) return;
    void refreshRates();
    // Only when the setting or the screen changes, so a failed download is not retried in a loop.
  }, [settings.autoConvert, entered]);
  useEffect(() => {
    const retry = () => {
      if (settings.autoConvert && !isFresh(rates)) void refreshRates();
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [settings.autoConvert, rates, refreshRates]);

  const converter: Converter | null =
    settings.autoConvert && rates ? { base: currencyKey(settings.defaultCurrency), table: rates } : null;

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

  // ---- Cloud sync: opt-in, and it only runs for the account that opted in ----
  const latest = useRef({ items, tombstones });
  latest.current = { items, tombstones };
  const inFlight = useRef(false);
  const rerun = useRef(false);
  const signedInUid = user?.uid ?? null;
  const syncOn = isSyncOn(settings, signedInUid);

  // The sync status belongs to one account, so start fresh when the signed-in person changes.
  useEffect(() => setSync({ state: "idle" }), [signedInUid]);

  // When someone turns sync on for a device that still holds a different account's items, they choose
  // what happens to those items, so they are never quietly added to the wrong account.
  const confirmedOwner = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !syncOn || confirmedOwner.current === user.uid) return;
    confirmedOwner.current = user.uid;
    const owner = loadOwner();
    if (owner && owner !== user.uid && latest.current.items.length > 0) {
      const addThem = window.confirm(
        "This device still has items from a different account.\n\nOK: add them to the account you just signed in to.\nCancel: remove them from this device.",
      );
      if (!addThem) {
        clearLocalData();
        void clearReceiptImages();
        setItems([]);
        setTombstones({});
      }
    }
    saveOwner(user.uid);
  }, [user, syncOn]);

  const runSync = useCallback(async () => {
    if (!user || !syncOn) return;
    if (inFlight.current) {
      rerun.current = true;
      return;
    }
    inFlight.current = true;
    setSync((s) => ({ ...s, state: "syncing" }));
    try {
      const { syncItems } = await import("./core/sync");
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error("Sync timed out"), { code: "deadline-exceeded" })), SYNC_TIMEOUT_MS),
      );
      // A reply that arrives after the time limit is simply dropped. The next sync catches up.
      const itemsBefore = latest.current.items;
      const result = await Promise.race([syncItems(user.uid, itemsBefore, latest.current.tombstones), timeout]);
      // Tell the person when the account had items this device did not (for example ones deleted while offline).
      const found = describeDiscovery(findNewItems(itemsBefore, result.items));
      if (found) setDiscovery(found);
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
  }, [user, syncOn]);

  useEffect(() => {
    if (!user || !syncOn) return;
    const timer = setTimeout(() => void runSync(), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items, tombstones, user, syncOn, runSync]);

  // Try again when the connection comes back.
  useEffect(() => {
    const retry = () => void runSync();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [runSync]);

  // ---- Changing items ----
  const patch = (id: string, change: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change, updatedAt: Date.now() } : i)));

  /**
   * A delete only reaches the account's backup while sync is running and the device is online. Made offline
   * (or signed out, or with sync off), it removes the item from this device only: if the item is in the
   * backup it comes back at the next sync, for example when the person logs back in.
   */
  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (deleteReachesBackup(syncOn, navigator.onLine)) {
      setTombstones((prev) => ({ ...prev, [id]: Date.now() }));
    }
    void deleteReceiptImage(id);
  }

  /** Asks first, in words that match what will really happen, then deletes. */
  function requestDelete(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (!window.confirm(deleteQuestion(item.name, deleteReachesBackup(syncOn, navigator.onLine)))) return;
    deleteItem(id);
    closeEdit();
  }

  /** Clears one role of an item (expense, warranty or subscription). Deletes it if no role is left. */
  function dropRole(id: string, change: Partial<Item>) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (isOrphan({ ...item, ...change })) {
      const ok = window.confirm(
        `"${item.name}" is not an expense, warranty or subscription any more, so it would have nowhere to show. Delete it?` +
          (deleteReachesBackup(syncOn, navigator.onLine)
            ? ""
            : "\n\nIf it is backed up in your account, it comes back the next time you sync."),
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

  function toggleNotify(id: string) {
    const turningOn = !items.find((i) => i.id === id)?.notify;
    if (turningOn) askForNotifications();
    patch(id, { notify: turningOn });
  }

  // ---- Account and data ----
  async function signOut() {
    // One last sync, so changes made in the final moments are not left only on this device.
    if (user && syncOn) {
      await Promise.race([runSync(), new Promise((resolve) => setTimeout(resolve, 4000))]);
    }
    try {
      await signOutAccount();
    } catch {
      // Signing out locally still works if the network call fails.
    }
    clearSession();
    setSession(null);
    goTo("scan");
  }

  function goToWelcome() {
    clearSession();
    setSession(null);
    setMenuOpen(false);
  }

  /** Turns sync on for the signed-in account, or off. Only that account is ever synced. */
  function setSyncFor(on: boolean) {
    if (!user) return;
    setSettings((s) => ({ ...s, syncUid: on ? user.uid : null }));
    if (!on) hidePrompt(false); // switching sync off brings the reminder back
  }

  function hidePrompt(hidden: boolean) {
    setPromptHidden(hidden);
    savePromptHidden(hidden);
  }

  /** The button in the bottom-right corner: it explains what sync does and turns it on only if the person agrees. */
  function askToTurnOnSync() {
    const agreed = window.confirm(
      "Back up the details of your items (name, amount, dates, category) to your account?\n\nReceipt photos are never uploaded. You can switch this off at any time in Sync Settings.",
    );
    if (!agreed) return;
    setSyncFor(true);
    setToast("Sync is on. Your item details are now backed up to your account.");
  }

  function deleteDeviceData() {
    clearLocalData();
    void clearReceiptImages();
    setItems([]);
    setTombstones({});
    // Otherwise sync would simply download everything again. This is the user's own choice.
    setSettings((s) => ({ ...s, syncUid: null }));
  }

  async function deleteCloud() {
    if (!user) return;
    const { deleteCloudData } = await import("./core/sync");
    await deleteCloudData(user.uid);
    // Otherwise sync would simply upload everything again. This is the user's own choice.
    setSettings((s) => ({ ...s, syncUid: null }));
  }

  // ---- What to show ----
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
  // The opt-in button shows on every page while accounts exist and this person is not syncing, until they hide it.
  const showSyncPrompt = isFirebaseConfigured && !syncOn && !promptHidden;

  return (
    <div className={showSyncPrompt ? "phone has-fab" : "phone"}>
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
        {page === "scan" && (
          <ScanScreen defaultCurrency={settings.defaultCurrency} rates={rates} onAdd={addItem} />
        )}
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
            converter={converter}
            onEdit={openEdit}
            onNotSubscription={(id) =>
              dropRole(id, { isSubscription: false, nextPayment: "", subscriptionActive: true })
            }
            onSetActive={(id, active) => patch(id, { subscriptionActive: active })}
          />
        )}
        {page === "expenses" && (
          <ExpensesScreen
            items={items}
            converter={converter}
            ratesMissing={settings.autoConvert && rates === null}
            onEdit={openEdit}
            onNotExpense={(id) => dropRole(id, { isExpense: false })}
          />
        )}
        {page === "sync" && (
          <SyncSettingsScreen
            rates={{ status: ratesStatus, date: rates?.date ?? null }}
            onRefreshRates={() => void refreshRates()}
            user={user}
            accountsAvailable={isFirebaseConfigured}
            settings={settings}
            onSettings={setSettings}
            syncOn={syncOn}
            onSetSync={setSyncFor}
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
              rates={rates}
              onSave={saveEdit}
              onDelete={requestDelete}
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

      {showSyncPrompt && (
        <SyncPrompt mode={user ? "enable" : "signin"} onClick={user ? askToTurnOnSync : goToWelcome} onHide={() => hidePrompt(true)} />
      )}
      {toast && (
        <p className="toast" role="status">
          {toast}
        </p>
      )}
      {discovery && <DiscoveryDialog discovery={discovery} onClose={() => setDiscovery(null)} />}
    </div>
  );
}
