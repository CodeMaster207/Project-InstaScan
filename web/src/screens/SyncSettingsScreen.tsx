import { useState } from "react";
import type { AuthUser } from "../core/auth";
import type { Settings } from "../core/types";

export interface SyncStatus {
  state: "idle" | "syncing" | "ok" | "error";
  message?: string;
  lastSynced?: number;
}

export interface RatesInfo {
  status: "idle" | "loading" | "error";
  /** Publication date of the rates in use, or null when none have been downloaded. */
  date: string | null;
}

interface Props {
  rates: RatesInfo;
  onRefreshRates: () => void;
  user: AuthUser | null;
  accountsAvailable: boolean;
  settings: Settings;
  onSettings: (next: Settings) => void;
  /** True when the signed-in account has opted in to sync. */
  syncOn: boolean;
  onSetSync: (on: boolean) => void;
  status: SyncStatus;
  itemCount: number;
  onSyncNow: () => void;
  onDeleteCloud: () => Promise<void>;
  onDeleteDevice: () => void;
  onSignOut: () => void;
  onGoSignIn: () => void;
}

/** Sync settings draft: account, opt-in backup and sync, currency, and control over your data. */
export function SyncSettingsScreen({
  rates,
  onRefreshRates,
  user,
  accountsAvailable,
  settings,
  onSettings,
  syncOn,
  onSetSync,
  status,
  itemCount,
  onSyncNow,
  onDeleteCloud,
  onDeleteDevice,
  onSignOut,
  onGoSignIn,
}: Props) {
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);

  function commitCurrency() {
    const next = currency.trim().toUpperCase().slice(0, 4);
    if (next) onSettings({ ...settings, defaultCurrency: next });
    else setCurrency(settings.defaultCurrency);
  }

  const statusText =
    status.state === "syncing"
      ? "Syncing…"
      : status.state === "error"
        ? (status.message ?? "Sync failed.")
        : status.lastSynced
          ? `Last synced at ${new Date(status.lastSynced).toLocaleTimeString()}.`
          : "Not synced yet.";

  return (
    <div className="page">
      <section className="section">
        <h2 className="section-title">
          <u>Account</u>
        </h2>
        <div className="panel">
          {user ? (
            <>
              <p>
                Signed in as <strong>{user.email}</strong>
              </p>
              <button className="btn btn-outline" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <p>You are using InstaScan without an account. Your items stay on this device.</p>
              <button className="btn btn-primary" onClick={onGoSignIn} disabled={!accountsAvailable}>
                Sign in or register
              </button>
              {!accountsAvailable && <p className="muted">Accounts are off because this build has no Firebase keys.</p>}
            </>
          )}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">
          <u>Back up and sync</u>
        </h2>
        <div className="panel">
          <label className="check">
            <input
              type="checkbox"
              checked={syncOn}
              disabled={!user}
              onChange={(e) => onSetSync(e.target.checked)}
            />
            <strong>Sync my items to my account</strong>
          </label>
          <p className="muted">
            Off until you turn it on. When on, the details of your items (name, amount, dates, category, notes) are
            kept in your account so you can use them on another device. <strong>Receipt photos are never uploaded.</strong>{" "}
            You can switch it off at any time. An item you delete while offline is only removed from this device, and
            comes back at your next sync.
            {!user && " Sign in or register to turn this on."}
          </p>
          {user && syncOn && (
            <>
              <p role="status" className={status.state === "error" ? "error" : "muted"}>
                {statusText}
              </p>
              <button className="btn btn-outline" onClick={onSyncNow} disabled={status.state === "syncing"}>
                Sync now
              </button>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">
          <u>Currency</u>
        </h2>
        <div className="panel">
          <label className="field">
            <span>Used when you type an amount without one</span>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              onBlur={commitCurrency}
              onKeyDown={(e) => e.key === "Enter" && commitCurrency()}
              maxLength={4}
              placeholder="RM"
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.autoConvert}
              onChange={(e) => onSettings({ ...settings, autoConvert: e.target.checked })}
            />
            <strong>Convert other currencies into this one automatically</strong>
          </label>
          <p className="muted">
            Totals and charts are shown in your default currency. Other currencies are converted at the latest
            European Central Bank rate (from frankfurter.dev). Only currency codes are sent to look up the rate,
            never your amounts or items. Each item keeps its original amount.
          </p>
          {settings.autoConvert && (
            <>
              <p role="status" className={rates.status === "error" ? "error" : "muted"}>
                {rates.status === "loading"
                  ? "Updating exchange rates…"
                  : rates.status === "error"
                    ? "Could not update the exchange rates. " + (rates.date ? `Using the rates from ${rates.date}.` : "Totals show each currency separately for now.")
                    : rates.date
                      ? `Rates from ${rates.date}.`
                      : "No exchange rates downloaded yet."}
              </p>
              <button className="btn btn-outline" onClick={onRefreshRates} disabled={rates.status === "loading"}>
                Update exchange rates
              </button>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">
          <u>Your data</u>
        </h2>
        <div className="panel">
          <p className="muted">
            {itemCount} item{itemCount === 1 ? "" : "s"} on this device. Nothing leaves it unless sync is on.
          </p>
          <div className="stack">
            <button
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete every item and receipt photo on this device? Sync will be switched off, and this cannot be undone.",
                  )
                ) {
                  onDeleteDevice();
                }
              }}
            >
              Delete data on this device
            </button>
            {user && (
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Delete everything stored in your account's cloud backup? Items on your devices stay, and sync will be switched off.",
                    )
                  ) {
                    return;
                  }
                  try {
                    await onDeleteCloud();
                    setCloudMessage("Your cloud backup was deleted and sync was switched off.");
                  } catch {
                    setCloudMessage("Could not delete the cloud backup. Check your connection and try again.");
                  }
                }}
              >
                Delete my cloud backup
              </button>
            )}
          </div>
          {cloudMessage && (
            <p role="status" className="muted">
              {cloudMessage}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
