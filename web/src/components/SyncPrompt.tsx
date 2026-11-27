import { Icon } from "./Icon";

interface Props {
  /** "enable": signed in but not syncing. "signin": no account yet, so sign in first. */
  mode: "enable" | "signin";
  onClick: () => void;
  /** Hides the button until sync is switched off again. */
  onHide: () => void;
}

/**
 * The pop-up button in the bottom-right corner, on every page until it is hidden. that lets a person opt in to cloud sync. Sync is never on until
 * they use it: for someone without an account it leads to sign-in, and for a signed-in person it asks
 * once, explaining what is stored, before turning sync on.
 */
export function SyncPrompt({ mode, onClick, onHide }: Props) {
  const label = mode === "enable" ? "Turn on sync" : "Sign in to sync";
  return (
    <div className="sync-fab" role="group" aria-label="Sync">
      <button
        type="button"
        className="sync-fab-main"
        onClick={onClick}
        title="Back up your item details to your account. Receipt photos are never uploaded."
      >
        <Icon name="cloud_upload" size={22} />
        <span>{label}</span>
      </button>
      <button type="button" className="sync-fab-hide" onClick={onHide} aria-label="Hide the sync button" title="Hide">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
