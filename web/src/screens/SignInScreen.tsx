import { Brand } from "../components/Logo";

/** Welcome screen. There are no accounts yet: receipts are stored on this device only. */
export function SignInScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="signin">
      <div className="signin-brand">
        <Brand size={80} heading />
      </div>
      <p className="muted signin-tagline">Scan a receipt. Never miss a warranty. Works offline.</p>
      <button className="btn btn-primary btn-block" onClick={onStart}>
        Get started
      </button>
    </main>
  );
}
