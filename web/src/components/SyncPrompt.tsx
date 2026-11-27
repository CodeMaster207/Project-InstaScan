import { Icon } from "./Icon";

interface Props {
  /** "enable": signed in but not syncing. "signin": no account yet, so sign in first. */
  mode: "enable" | "signin";
  onClick: () => void;
}

/**
 * The button in the bottom-right corner that lets a person opt in to cloud sync. Sync is never on until
 * they use it: for someone without an account it leads to sign-in, and for a signed-in person it asks
 * once, explaining what is stored, before turning sync on.
 */
export function SyncPrompt({ mode, onClick }: Props) {
  const label = mode === "enable" ? "Turn on sync" : "Sign in to sync";
  return (
    <button
      type="button"
      className="sync-fab"
      onClick={onClick}
      title="Back up your item details to your account. Receipt photos are never uploaded."
    >
      <Icon name="cloud_upload" size={22} />
      <span>{label}</span>
    </button>
  );
}
