import { useState, type FormEvent } from "react";
import { describeAuthError, MIN_PASSWORD_LENGTH, registerAccount, sendPasswordReset, signInAccount } from "../core/auth";
import { isFirebaseConfigured } from "../core/firebase";
import { Brand } from "../components/Logo";

interface Props {
  /** Continue without an account. Receipts stay on this device. */
  onUseOffline: () => void;
}

type View = "welcome" | "register" | "signin";

/**
 * Welcome screen from the draft: register, or use the app offline (AI scanning still works
 * without an account). Signing in or registering is handled by Firebase Authentication; the
 * app notices the new user on its own, so there is nothing to return here.
 */
export function SignInScreen({ onUseOffline }: Props) {
  const [view, setView] = useState<View>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!email.trim()) return setMessage({ kind: "error", text: "Enter your email address." });
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setMessage({ kind: "error", text: `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.` });
    }
    setBusy(true);
    try {
      if (view === "register") await registerAccount(email, password);
      else await signInAccount(email, password);
    } catch (error) {
      setMessage({ kind: "error", text: describeAuthError(error) });
      setBusy(false);
    }
  }

  async function forgot() {
    setMessage(null);
    if (!email.trim()) return setMessage({ kind: "error", text: "Type your email above first, then press this again." });
    try {
      await sendPasswordReset(email);
      setMessage({ kind: "info", text: "If that email has an account, a reset link is on its way." });
    } catch (error) {
      setMessage({ kind: "error", text: describeAuthError(error) });
    }
  }

  return (
    <main className="signin">
      <div className="signin-brand">
        <Brand size={80} heading />
      </div>
      <p className="muted signin-tagline">Scan a receipt. Never miss a warranty. Works offline.</p>

      {view === "welcome" && (
        <>
          <button className="btn btn-primary btn-block" onClick={() => setView("register")} disabled={!isFirebaseConfigured}>
            Register!
          </button>
          <button className="btn btn-outline btn-block" onClick={() => setView("signin")} disabled={!isFirebaseConfigured}>
            Sign in
          </button>
          <button className="btn btn-outline btn-block" onClick={onUseOffline}>
            Use it offline
          </button>
          {!isFirebaseConfigured ? (
            <p className="muted signin-note">Accounts are off because this build has no Firebase keys.</p>
          ) : (
            <p className="muted signin-note">
              An account is optional. It only lets you back up and sync your items. Nothing is uploaded unless you turn
              sync on.
            </p>
          )}
        </>
      )}

      {view !== "welcome" && (
        <form className="auth-form" onSubmit={(e) => void submit(e)}>
          <h2 className="auth-title">{view === "register" ? "Create your account" : "Sign in"}</h2>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={view === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {view === "register" && <small className="muted">At least {MIN_PASSWORD_LENGTH} characters.</small>}
          </label>
          {message && (
            <p className={message.kind === "error" ? "notice notice-error" : "notice"} role="alert">
              {message.text}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Please wait…" : view === "register" ? "Register!" : "Sign in"}
          </button>
          {view === "signin" && (
            <button type="button" className="link-btn" onClick={() => void forgot()}>
              Forgot your password?
            </button>
          )}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setView(view === "register" ? "signin" : "register");
              setMessage(null);
            }}
          >
            {view === "register" ? "I already have an account" : "Create an account instead"}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setView("welcome");
              setMessage(null);
              setBusy(false);
            }}
          >
            Back
          </button>
        </form>
      )}
    </main>
  );
}
